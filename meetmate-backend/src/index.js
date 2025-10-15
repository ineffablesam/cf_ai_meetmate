import { AutoRouter } from 'itty-router';

const router = AutoRouter();

// UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

// ============================================================================
// AI FUNCTIONS
// ============================================================================

async function transcribeAudio(audioBuffer, env) {
  const response = await env.AI.run('@cf/openai/whisper', {
    audio: [...new Uint8Array(audioBuffer)],
  });
  return response.text || 'No speech detected';
}

async function summarizeTranscript(transcript, env) {
  const systemPrompt = `You are an expert meeting summarizer. Analyze the transcript and return a JSON object with two fields:
1. summaryJSON: A structured object with title, participants (if detectable), topics (array of objects with title, summary, action_items), key_decisions (array), next_steps (array), tone, and overall_summary
2. summaryMarkdown: A clean, formatted markdown string with headings, lists, and highlights

Return ONLY valid JSON, no markdown code blocks.`;

  const userPrompt = `Transcript:
"""
${transcript}
"""

Generate a comprehensive summary in JSON format with summaryJSON and summaryMarkdown fields.`;

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log('Calling AI with model: @cf/meta/llama-3.3-70b-instruct-fp8-fast');

    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { 
      messages,
      temperature: 0.7,
      max_tokens: 2048
    });

    // Log the raw response to see what we're getting
    console.log('Raw AI response:', JSON.stringify(response));

    // Try different response paths
    let content = response.response || 
                  response.result?.response || 
                  response.result?.content ||
                  response.content ||
                  '';
    
    console.log('Extracted content:', content);

    if (!content) {
      console.error('Empty content from AI response');
      throw new Error('Empty response from AI');
    }

    // Clean up the response - remove markdown code blocks if present
    content = content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    console.log('Cleaned content:', content);

    // Try to parse the JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log('Successfully parsed JSON:', JSON.stringify(parsed));
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Extracted JSON match:', jsonMatch[0]);
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON found in content');
        throw parseError;
      }
    }

    // Validate required fields
    if (!parsed.summaryJSON || !parsed.summaryMarkdown) {
      console.warn('Missing required fields in parsed JSON, creating fallback');
      
      // Create a fallback structure
      parsed = {
        summaryJSON: parsed.summaryJSON || {
          title: "Meeting Summary",
          overall_summary: transcript.substring(0, 300) + "...",
          topics: [],
          key_decisions: [],
          next_steps: [],
          tone: "professional"
        },
        summaryMarkdown: parsed.summaryMarkdown || `# Meeting Summary\n\n${transcript.substring(0, 500)}...`
      };
    }

    console.log('Returning parsed summary');
    return parsed;

  } catch (err) {
    console.error('AI summarization error:', err);
    console.error('Error stack:', err.stack);
    
    // Return a basic fallback structure
    return {
      summaryJSON: {
        title: "Meeting Summary",
        overall_summary: transcript.length > 500 
          ? transcript.substring(0, 500) + "..." 
          : transcript,
        topics: [{
          title: "Discussion",
          summary: "Full transcript available",
          action_items: []
        }],
        key_decisions: [],
        next_steps: [],
        tone: "professional",
        participants: []
      },
      summaryMarkdown: `# Meeting Summary

## Transcript
${transcript.length > 1000 ? transcript.substring(0, 1000) + "..." : transcript}

---
*Note: AI summarization encountered an error: ${err.message}*`
    };
  }
}

async function logProcessingStatus(meetingId, step, status, env, errorMessage = null, durationMs = null) {
  try {
    const statusId = uuidv4();
    await env.DB.prepare(
      'INSERT INTO processing_status (id, meeting_id, step, status, error_message, duration_ms) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(statusId, meetingId, step, status, errorMessage, durationMs).run();
  } catch (error) {
    console.error('Failed to log processing status:', error);
  }
}

// ============================================================================
// ROUTES
// ============================================================================

// Home route
router.get('/', () => {
  return 'MeetMate Backend is running';
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

router.get('/api/auth/google/start', (req, env) => {
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || '';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const scope = url.searchParams.get('scope') || 'openid email profile';

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizeUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('access_type', 'offline');
  authorizeUrl.searchParams.set('prompt', 'consent');
  if (state) authorizeUrl.searchParams.set('state', state);
  if (codeChallenge) {
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  }

  return Response.redirect(authorizeUrl.toString(), 302);
});

router.get('/api/auth/callback', (req, env) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const target = error
    ? `chrome-extension://${env.EXTENSION_ID}/popup.html?auth=error&error=${encodeURIComponent(error)}`
    : `chrome-extension://${env.EXTENSION_ID}/popup.html${code ? `?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}` : '?auth=error&error=missing_code'}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${target}">
</head>
<body>
  <script>window.location.replace('${target}');</script>
  <p>Redirecting...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
});

router.post('/api/auth/google', async (req, env) => {
  const { code, redirect_uri, code_verifier } = await req.json();

  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirect_uri || env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  if (code_verifier) {
    params.append('code_verifier', code_verifier);
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return { error: tokens.error_description || 'Token exchange failed', status: 400 };
  }

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const googleUser = await userResponse.json();

  const existingUser = await env.DB.prepare(
    'SELECT id, email, name FROM users WHERE google_id = ?'
  ).bind(googleUser.id).first();

  let dbUser;
  if (existingUser) {
    dbUser = existingUser;
  } else {
    const userId = uuidv4();
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, google_id) VALUES (?, ?, ?, ?)'
    ).bind(userId, googleUser.email, googleUser.name, googleUser.id).run();
    dbUser = { id: userId, email: googleUser.email, name: googleUser.name };
  }

  return {
    success: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    },
    accessToken: tokens.access_token,
  };
});

router.post('/api/auth/google/verify', async (req, env) => {
  const { googleId, email, name } = await req.json();

  if (!googleId || !email) {
    return { error: 'Google ID and email required', status: 400 };
  }

  const existingUser = await env.DB.prepare(
    'SELECT id, email, name FROM users WHERE google_id = ?'
  ).bind(googleId).first();

  let dbUser;
  if (existingUser) {
    dbUser = existingUser;
  } else {
    const userId = uuidv4();
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, google_id) VALUES (?, ?, ?, ?)'
    ).bind(userId, email, name, googleId).run();
    dbUser = { id: userId, email, name };
  }

  return {
    success: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    },
  };
});

// ============================================================================
// RECORDING ROUTES
// ============================================================================

router.post('/api/recordings/start', async (req, env) => {
  const { meetingName, userId, realtimeProcessing } = await req.json();

  if (!meetingName || !userId) {
    return { error: 'Meeting name and user ID required', status: 400 };
  }

  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!existingUser) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)'
    ).bind(userId, `${userId}@temp.local`, 'Anonymous User').run();
  }

  const meetingId = uuidv4();

  await env.DB.prepare(
    'INSERT INTO meetings (id, user_id, meeting_name, status) VALUES (?, ?, ?, ?)'
  ).bind(meetingId, userId, meetingName, 'recording').run();

  return {
    success: true,
    meetingId,
    realtimeProcessing,
  };
});

router.post('/api/recordings/:meetingId/upload-chunk', async (req, env) => {
  const { meetingId } = req;
  const audioData = await req.arrayBuffer();

  if (env.BUCKET) {
    const key = `${meetingId}-${Date.now()}.webm`;
    await env.BUCKET.put(key, audioData, {
      httpMetadata: { contentType: 'audio/webm' },
    });
  }

  const transcription = await transcribeAudio(audioData, env);

  return {
    success: true,
    transcription,
  };
});

router.post('/api/recordings/:meetingId/complete', async (req, env) => {
  const { meetingId } = req.params;
  const { audioBlob } = await req.json();

  const overallStartTime = Date.now();

  try {
    // Mark processing started
    await env.DB.prepare(
      'UPDATE meetings SET status = ?, processing_started_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('processing', meetingId).run();

    await logProcessingStatus(meetingId, 'processing_started', 'processing', env);

    // Convert Base64 to binary
    const base64Data = audioBlob.split(',')[1] || audioBlob;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Step 1: Transcribe with timing
    const transcriptionStartTime = Date.now();
    await logProcessingStatus(meetingId, 'transcription_started', 'processing', env);
    
    const transcript = await transcribeAudio(bytes.buffer, env);
    const transcriptionDuration = Date.now() - transcriptionStartTime;
    
    await logProcessingStatus(meetingId, 'transcription_complete', 'success', env, null, transcriptionDuration);

    await env.DB.prepare(
      'UPDATE meetings SET transcript = ? WHERE id = ?'
    ).bind(transcript, meetingId).run();

    // Step 2: Summarize with timing
    const summarizationStartTime = Date.now();
    await logProcessingStatus(meetingId, 'summarization_started', 'processing', env);
    
    const { summaryJSON, summaryMarkdown } = await summarizeTranscript(transcript, env);
    const summarizationDuration = Date.now() - summarizationStartTime;
    
    await logProcessingStatus(meetingId, 'summarization_complete', 'success', env, null, summarizationDuration);

    // Calculate total duration
    const totalDuration = Date.now() - overallStartTime;

    // Step 3: Save everything including timing
    await env.DB.prepare(
      'UPDATE meetings SET summary = ?, status = ?, processing_completed_at = CURRENT_TIMESTAMP, processing_duration_ms = ? WHERE id = ?'
    ).bind(
      JSON.stringify({ json: summaryJSON, markdown: summaryMarkdown }), 
      'completed', 
      totalDuration,
      meetingId
    ).run();

    await logProcessingStatus(meetingId, 'processing_complete', 'success', env, null, totalDuration);

    return {
      success: true,
      meetingId,
      transcript,
      summaryJSON,
      summaryMarkdown,
      timing: {
        transcriptionMs: transcriptionDuration,
        summarizationMs: summarizationDuration,
        totalMs: totalDuration,
        transcriptionSeconds: (transcriptionDuration / 1000).toFixed(2),
        summarizationSeconds: (summarizationDuration / 1000).toFixed(2),
        totalSeconds: (totalDuration / 1000).toFixed(2),
      }
    };
  } catch (error) {
    const errorDuration = Date.now() - overallStartTime;
    await logProcessingStatus(meetingId, 'error', 'failed', env, error.message, errorDuration);
    await env.DB.prepare(
      'UPDATE meetings SET status = ?, processing_completed_at = CURRENT_TIMESTAMP, processing_duration_ms = ? WHERE id = ?'
    ).bind('failed', errorDuration, meetingId).run();

    return { error: error.message, status: 500 };
  }
});

router.post('/api/recordings/:meetingId/cancel', async (req, env) => {
  const { meetingId } = req.params;

  try {
    // Check if meeting exists
    const meeting = await env.DB.prepare(
      'SELECT id, status FROM meetings WHERE id = ?'
    ).bind(meetingId).first();

    if (!meeting) {
      return { error: 'Meeting not found', status: 404 };
    }

    // Update meeting status to cancelled
    await env.DB.prepare(
      'UPDATE meetings SET status = ?, processing_completed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('cancelled', meetingId).run();

    // Log cancellation
    await logProcessingStatus(meetingId, 'recording_cancelled', 'cancelled', env, 'User cancelled the recording');

    return {
      success: true,
      meetingId,
      message: 'Recording cancelled successfully'
    };
  } catch (error) {
    console.error('Error cancelling recording:', error);
    return { error: error.message, status: 500 };
  }
});

// ============================================================================
// MEETING ROUTES
// ============================================================================

router.get('/api/meetings', async (req, env) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return { error: 'User ID required', status: 400 };
  }

  const result = await env.DB.prepare(
    'SELECT * FROM meetings WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  const meetings = result.results.map(m => ({
    ...m,
    summary: m.summary ? JSON.parse(m.summary) : null,
    processingTimeSeconds: m.processing_duration_ms ? (m.processing_duration_ms / 1000).toFixed(2) : null,
  }));

  return {
    success: true,
    meetings,
  };
});

router.get('/api/meetings/:meetingId', async (req, env) => {
  const { meetingId } = req;

  const meeting = await env.DB.prepare(
    'SELECT * FROM meetings WHERE id = ?'
  ).bind(meetingId).first();

  if (!meeting) {
    return { error: 'Meeting not found', status: 404 };
  }

  const historyResult = await env.DB.prepare(
    'SELECT * FROM processing_status WHERE meeting_id = ? ORDER BY timestamp ASC'
  ).bind(meetingId).all();

  // Add readable duration to processing history
  const processingHistory = historyResult.results.map(h => ({
    ...h,
    durationSeconds: h.duration_ms ? (h.duration_ms / 1000).toFixed(2) : null,
  }));

  return {
    success: true,
    meeting: {
      ...meeting,
      summary: meeting.summary ? JSON.parse(meeting.summary) : null,
      processingTimeSeconds: meeting.processing_duration_ms ? (meeting.processing_duration_ms / 1000).toFixed(2) : null,
    },
    processingHistory,
  };
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

router.post('/api/notifications/email', async (req, env) => {
  const { userEmail, meetingName, summary, timestamp } = await req.json();

  if (!userEmail || !meetingName || !summary) {
    return { error: 'Missing required fields', status: 400 };
  }

  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎙️ Meeting Summary Ready</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">${meetingName}</h2>
          <p style="color: #666; margin-bottom: 25px;">Your meeting has been processed and summarized successfully!</p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-top: 0;">📋 Main Discussion Points</h3>
            <ul style="color: #555; line-height: 1.6;">
              ${summary.mainPoints?.map(point => `<li>${point}</li>`).join('') || '<li>No main points identified</li>'}
            </ul>
            
            ${summary.decisions?.length > 0 ? `
              <h3 style="color: #333; margin-top: 25px;">✅ Decisions Made</h3>
              <ul style="color: #555; line-height: 1.6;">
                ${summary.decisions.map(decision => `<li>${decision}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${summary.actionItems?.length > 0 ? `
              <h3 style="color: #333; margin-top: 25px;">📝 Action Items</h3>
              <ul style="color: #555; line-height: 1.6;">
                ${summary.actionItems.map(item => `<li>${item}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${summary.nextSteps?.length > 0 ? `
              <h3 style="color: #333; margin-top: 25px;">🚀 Next Steps</h3>
              <ul style="color: #555; line-height: 1.6;">
                ${summary.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Generated by MeetMate AI • ${new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;

    console.log('Email notification:', {
      to: userEmail,
      subject: `Meeting Summary: ${meetingName}`,
      content: emailContent
    });

    return {
      success: true,
      message: 'Email notification queued successfully'
    };
  } catch (error) {
    console.error('Email notification error:', error);
    return { error: 'Failed to send email notification', status: 500 };
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default { ...router };