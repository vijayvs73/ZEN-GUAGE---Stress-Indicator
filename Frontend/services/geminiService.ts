import { GameResult, StressAnalysis, Message, AssessmentHistoryItem } from "../types";

// Local stress analysis without API
export const analyzeStress = async (results: GameResult, coords?: { latitude: number, longitude: number }): Promise<StressAnalysis> => {
  try {
    // Log received results for debugging
    console.log('📊 Analyzing stress with results:', results);
    
    // Safely extract values with defaults
    const reactionTime = results.reactionTime ?? 300; // Default average reaction time
    const memoryScore = results.memoryScore ?? 50; // Default average memory score
    const tappingSpeed = results.tappingSpeed ?? 5; // Default average tapping speed
    const accuracy = results.accuracy ?? 70; // Default average accuracy
    
    console.log('📊 Parsed values:', { reactionTime, memoryScore, tappingSpeed, accuracy });
    
    // Calculate stress level based on game results
    // Higher reaction time = more stress (above 250ms is slower)
    const reactionPenalty = Math.max(0, (reactionTime - 250) / 250 * 30);
    
    // Lower memory score = more stress (below 80 is worse)
    const memoryPenalty = Math.max(0, (80 - memoryScore) / 80 * 25);
    
    // Lower tapping consistency/speed = more stress (below 6 is slower)
    const tappingPenalty = Math.max(0, (6 - tappingSpeed) / 6 * 20);
    
    // Lower accuracy = more stress (below 90 is worse)
    const accuracyPenalty = Math.max(0, (90 - accuracy) / 90 * 25);
    
    console.log('📊 Penalties:', { reactionPenalty, memoryPenalty, tappingPenalty, accuracyPenalty });
    
    const stressLevel = Math.min(100, Math.round(reactionPenalty + memoryPenalty + tappingPenalty + accuracyPenalty));
    console.log('📊 Final stress level:', stressLevel);

    // Generate personalized insights based on actual performance
    const insights: string[] = [];
    
    // Reaction time insight
    if (reactionTime < 200) {
      insights.push("Reflexes are exceptional—your alertness is high.");
    } else if (reactionTime < 280) {
      insights.push("Reflexes are solid—you're focused and responsive.");
    } else if (reactionTime < 350) {
      insights.push("Reaction time is average—may indicate mild fatigue.");
    } else {
      insights.push("Slower reactions detected—consider taking a break.");
    }
    
    // Memory score insight  
    if (memoryScore >= 90) {
      insights.push("Memory performance is outstanding—excellent cognitive function.");
    } else if (memoryScore >= 70) {
      insights.push("Memory is working well with room for improvement.");
    } else if (memoryScore >= 50) {
      insights.push("Memory shows some strain—mental fatigue may be present.");
    } else {
      insights.push("Memory performance indicates high cognitive load.");
    }
    
    // Accuracy insight
    if (accuracy >= 90) {
      insights.push("Accuracy is excellent—you're calm and precise.");
    } else if (accuracy >= 70) {
      insights.push("Accuracy is solid with room to sharpen focus.");
    } else if (accuracy >= 50) {
      insights.push("Speed is high but precision dipped—signs of overdrive.");
    } else {
      insights.push("Accuracy needs work—stress may be affecting precision.");
    }

    const suggestions = [
      {
        title: "Box Breathing",
        description: "Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 times.",
        type: "breathing" as const,
        duration: "3 minutes"
      },
      {
        title: "Posture Reset",
        description: "Roll shoulders back, unclench jaw, relax your face muscles.",
        type: "physical" as const,
        duration: "1 minute"
      },
      {
        title: "5-4-3-2-1 Grounding",
        description: "Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.",
        type: "mental" as const,
        duration: "2 minutes"
      }
    ];

    const summaries: Record<string, string> = {
      low: "Your cognitive performance shows you're in a calm, focused state. Keep up the excellent work!",
      moderate: "Assessment complete. Your stress level appears manageable—small adjustments can help you feel even better.",
      high: "Your metrics indicate elevated stress. Take a moment to pause and try our recommended exercises."
    };

    const category = stressLevel < 40 ? "low" : stressLevel < 70 ? "moderate" : "high";

    return {
      stressLevel,
      summary: summaries[category],
      suggestions,
      insights
    };
  } catch (error) {
    return {
      stressLevel: 50,
      summary: "Assessment completed. Stress level moderate.",
      suggestions: [],
      insights: []
    };
  }
};

export const getMindsetReport = async (history: AssessmentHistoryItem[]): Promise<string> => {
  if (history.length < 2) return "Complete more assessments to generate a long-term mindset report.";
  
  try {
    const historyData = history.slice(0, 10);
    const avgStress = historyData.reduce((sum, h) => sum + h.stressLevel, 0) / historyData.length;
    const avgAccuracy = historyData.reduce((sum, h) => sum + h.results.accuracy, 0) / historyData.length;
    const trend = history[0]?.stressLevel > (history[Math.min(5, history.length - 1)]?.stressLevel || 50) ? "improving" : "fluctuating";
    
    const insights: string[] = [];
    
    // Generate personalized insights
    if (avgStress < 40) {
      insights.push("✓ You're maintaining excellent stress management.");
    } else if (avgStress > 70) {
      insights.push("⚠ Your stress levels are elevated. Consider prioritizing rest and relaxation.");
    }
    
    if (avgAccuracy > 85) {
      insights.push("✓ Your focus and accuracy are strong. You're performing well cognitively.");
    } else if (avgAccuracy < 70) {
      insights.push("⚠ Your accuracy could improve. This might indicate fatigue or distraction.");
    }

    const report = `
📊 **Your Mindset Report**

Average Stress Level: ${Math.round(avgStress)}/100
Average Accuracy: ${Math.round(avgAccuracy)}%
Progress Trend: ${trend}

${insights.join('\n')}

**Recommendation**: Continue your mindfulness practice. Small, consistent efforts compound into lasting change. You're building the habit of self-awareness—that's the foundation of good mental health.
    `;
    
    return report;
  } catch (e) {
    return "Mindset report is temporarily unavailable.";
  }
};

export const chatWithAI = async (messages: Message[]): Promise<Message> => {
  // Get the last user message for context
  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
  const userContent = lastUserMessage?.content?.toLowerCase().trim() || '';

  // Comprehensive response library organized by topic
  const responseLibrary = {
    stress: {
      keywords: ['stress', 'stressed', 'pressure', 'tense'],
      responses: [
        "I hear you. Stress is a natural response, but you have tools to manage it. Let's try a grounding exercise: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
        "What you're feeling is valid. Take a moment to pause. Sometimes the best thing to do is take 3 deep breaths and remind yourself: 'This moment will pass.'",
        "Stress tells us something matters. That's actually a strength. Try this: What's one small thing you can control right now? Focus on that."
      ]
    },
    anxiety: {
      keywords: ['anxiety', 'anxious', 'nervous', 'worried', 'worry'],
      responses: [
        "Anxiety loves uncertainty. Let's build certainty: What's one thing you know for sure right now that's going well?",
        "Your mind is trying to protect you, but it's running ahead. Bring it back to now: What's happening right here, right now?",
        "Progressive muscle relaxation helps: Tense each muscle group for 5 seconds, then release. Start with your toes and work up."
      ]
    },
    sleep: {
      keywords: ['sleep', 'tired', 'exhausted', 'fatigue', 'can\'t sleep', 'insomnia'],
      responses: [
        "Sleep affects everything. Here's a sleep ritual: No screens 30 mins before bed, cool room, deep breathing. Will you try it?",
        "Your mind might be racing at night. Try the 4-7-8 technique: Breathe in for 4, hold for 7, out for 8. It calms the nervous system.",
        "Quality sleep is self-care. You deserve rest. What's stopping you from getting better sleep?"
      ]
    },
    focus: {
      keywords: ['focus', 'concentrate', 'distracted', 'can\'t focus', 'concentration'],
      responses: [
        "Difficulty focusing often means you need a break or a shift. Try the Pomodoro: 25 minutes focused, 5 minutes rest. Ready?",
        "Your attention is like a muscle. If it's tired, that's normal. Let's strengthen it with a short meditation.",
        "Focus improves with clarity. What's ONE goal you want to focus on right now?"
      ]
    },
    motivation: {
      keywords: ['motivation', 'lazy', 'demotivated', 'procrastinating', 'procrastinate', 'no motivation'],
      responses: [
        "Motivation follows action, not the other way around. What's one tiny step you can take right now?",
        "Procrastination is often fear in disguise. What are you afraid of? Let's name it.",
        "Break your goal into 2-minute tasks. The hardest part is starting. What's your 2-minute task?"
      ]
    },
    sadness: {
      keywords: ['sad', 'depressed', 'down', 'blue', 'unhappy', 'lonely'],
      responses: [
        "What you're feeling matters. It's okay to feel sad sometimes. This emotion is temporary, even if it doesn't feel that way.",
        "Connection helps. Who's someone you trust? Sometimes we just need to talk.",
        "Small acts of self-care matter: a walk, music you love, a warm drink. What brings you comfort?"
      ]
    },
    excitement: {
      keywords: ['excited', 'great', 'amazing', 'wonderful', 'fantastic', 'happy'],
      responses: [
        "That's wonderful! Your mindset is your greatest tool. Keep building on this momentum.",
        "You're noticing the good—that's a powerful skill. Gratitude practice transforms everything. What else are you grateful for?",
        "I can feel your positivity. Let's bottle this feeling. What made today better?"
      ]
    },
    breathing: {
      keywords: ['breathing', 'breathe', 'breath', 'shortness of breath', 'can\'t breathe'],
      responses: [
        "Breathing is your anchor to the present moment. Try this: Inhale for 4 counts, hold for 4, exhale for 4. Repeat 5 times.",
        "Deep belly breathing activates your parasympathetic nervous system (the calm state). Hand on belly, feel it expand.",
        "When you feel stuck, return to your breath. It's always there, always now."
      ]
    },
    meditation: {
      keywords: ['meditation', 'meditate', 'mindfulness', 'meditate'],
      responses: [
        "Meditation isn't about clearing your mind—it's about noticing thoughts without judgment. Even 5 minutes helps.",
        "Try this: Sit quietly, focus on your breath. When your mind wanders (it will), gently return to breath. That's the practice.",
        "Meditation is like a gym membership for your mind. Consistency matters more than perfection."
      ]
    },
    exercise: {
      keywords: ['exercise', 'workout', 'fitness', 'movement', 'physical'],
      responses: [
        "Movement is medicine. Even a 10-minute walk releases endorphins and clears your mind.",
        "Your body and mind are connected. Moving your body shifts your emotional state.",
        "What kind of movement do you enjoy? That's the best exercise because you'll do it."
      ]
    },
    relationships: {
      keywords: ['relationship', 'friend', 'family', 'conflict', 'argument', 'social'],
      responses: [
        "Relationships require energy. It's okay to set boundaries and protect your peace.",
        "Often conflicts come from unmet needs or miscommunication. Can you name what you need?",
        "Healthy relationships involve people who accept you, support you, and grow with you."
      ]
    },
    work: {
      keywords: ['work', 'job', 'boss', 'colleague', 'career', 'office'],
      responses: [
        "Work stress is real. Remember: your worth isn't your productivity. You are enough regardless.",
        "Take breaks. Your brain needs rest to perform well. A 5-min pause actually increases productivity.",
        "What aspect of work stresses you most? Often naming it is the first step to managing it."
      ]
    },
    perfectionism: {
      keywords: ['perfect', 'perfectionism', 'mistake', 'failure', 'not good enough'],
      responses: [
        "Perfection is a prison. Progress beats perfection every time. What progress have you made?",
        "Mistakes are data, not failures. They're how we learn. What's one mistake that taught you something?",
        "You are enough right now, as you are. Flaws and all."
      ]
    },
    gratitude: {
      keywords: ['grateful', 'grateful', 'thankful', 'appreciation', 'appreciate'],
      responses: [
        "Gratitude rewires your brain. Neuroscience shows it reduces stress and increases happiness.",
        "What are 3 small things you're grateful for today? Even tiny things count.",
        "Gratitude isn't toxic positivity—it's acknowledging good alongside the hard."
      ]
    },
    time: {
      keywords: ['time', 'busy', 'rushing', 'hurried', 'no time'],
      responses: [
        "We all have the same 24 hours. The question is what we prioritize. What matters most to you?",
        "Slowing down doesn't waste time—it saves it. When you're present, you're more efficient.",
        "What would happen if you removed one 'should' from your day?"
      ]
    },
    confidence: {
      keywords: ['confidence', 'confident', 'doubt', 'insecure', 'self-doubt'],
      responses: [
        "Confidence isn't about never doubting yourself—it's doing it anyway despite the doubt.",
        "You've handled 100% of your worst days so far. You're stronger than you think.",
        "What's one thing you've accomplished that surprised you? That's your proof of capability."
      ]
    },
    general_questions: {
      keywords: ['how', 'what', 'when', 'where', 'why', 'can', 'could', 'would', 'should'],
      responses: [
        "That's a great question. Tell me more about what's behind it—I'm here to help.",
        "I'm glad you're asking. Curiosity is a sign of self-awareness. What do you think the answer might be?",
        "Different perspectives help. What feels true for you?"
      ]
    },
    affirmation_request: {
      keywords: ['help', 'support', 'encourage', 'believe'],
      responses: [
        "You're here. You're trying. That takes courage. I believe in you.",
        "You don't have to be perfect to be worthy of support. Let me help.",
        "What do you need most right now? I'm listening."
      ]
    }
  };

  // Find the best match for the user's message
  let response = "I'm here to listen and support you. What's on your mind?";
  
  for (const [category, data] of Object.entries(responseLibrary)) {
    const keywords = data.keywords;
    const responses = data.responses;
    
    if (keywords.some(keyword => userContent.includes(keyword))) {
      response = responses[Math.floor(Math.random() * responses.length)];
      break;
    }
  }

  // Special handling for very short messages or greetings
  if (userContent.length < 5) {
    const greetings = [
      "Hey there! How are you feeling today?",
      "Welcome! I'm here to support your journey. What's on your mind?",
      "Hi! What can I help you with?",
      "Hello! How can I support you right now?"
    ];
    response = greetings[Math.floor(Math.random() * greetings.length)];
  }

  // If still no match, provide thoughtful general response
  if (response === "I'm here to listen and support you. What's on your mind?") {
    const thoughtfulResponses = [
      "That's interesting. Tell me more—I want to understand what you're experiencing.",
      "I hear you. Every challenge is an opportunity to learn about yourself.",
      "Your thoughts matter. What's the deeper feeling beneath what you just shared?",
      "I'm here to help. Walk me through what's happening.",
      "That sounds important. How does it make you feel?",
      "Thank you for sharing. What would help you feel better about this?"
    ];
    response = thoughtfulResponses[Math.floor(Math.random() * thoughtfulResponses.length)];
  }

  return {
    role: 'model',
    content: response,
    timestamp: new Date(),
  };
};

export const getDailyAffirmation = async (context?: { stressLevel?: number, accuracy?: number }): Promise<string> => {
  const stressLevel = context?.stressLevel || 50;
  const accuracy = context?.accuracy || 75;

  // High stress affirmations (70+)
  const highStressAffirmations = [
    "Take one moment at a time. You are safe right now.",
    "This feeling is temporary. You have overcome challenges before.",
    "Your strength isn't in being perfect—it's in showing up.",
    "Breathe. You are stronger than this moment.",
    "You deserve compassion, especially from yourself right now.",
    "This is hard, and you're doing it anyway. That's courage."
  ];

  // Moderate stress affirmations (40-70)
  const moderateStressAffirmations = [
    "You have handled difficult moments before. You can handle this.",
    "Balance comes from small, consistent choices. You're making them.",
    "Your challenges are shaping your strength.",
    "Progress isn't linear. You're still moving forward.",
    "You are capable of managing this. Trust yourself.",
    "One step at a time is still forward."
  ];

  // Low stress affirmations (<40)
  const lowStressAffirmations = [
    "You possess the inner resources to handle whatever today brings.",
    "Focus on your breath; the rest will follow.",
    "You are stronger than you think.",
    "This moment is an opportunity to practice calm.",
    "Your mental health matters. Be kind to yourself.",
    "You are worthy of rest and relaxation.",
    "Every breath brings you closer to peace.",
    "Your efforts matter, even if progress feels slow.",
    "This too shall pass.",
    "You are capable of overcoming any challenge."
  ];

  // High accuracy affirmations (90+)
  const highAccuracyAffirmations = [
    "Your focus is sharp. You're in your zone.",
    "Excellence flows from you naturally.",
    "You're performing at your best. Trust that.",
    "Your clarity of mind is your superpower."
  ];

  // Select appropriate affirmations
  let affirmations = lowStressAffirmations;
  
  if (stressLevel > 70) {
    affirmations = highStressAffirmations;
  } else if (stressLevel > 40) {
    affirmations = moderateStressAffirmations;
  }

  // If also high accuracy, add those affirmations
  if (accuracy > 90) {
    affirmations = [...affirmations, ...highAccuracyAffirmations];
  }

  return affirmations[Math.floor(Math.random() * affirmations.length)];
};

export const findRelaxationVideos = async (queryType: string = "guided meditation"): Promise<{ title: string, uri: string }[]> => {
  return [
    { title: "10-Min Guided Meditation", uri: "https://www.youtube.com/results?search_query=10+minute+guided+meditation" },
    { title: "Relaxing Music for Stress Relief", uri: "https://www.youtube.com/results?search_query=relaxing+music+stress+relief" },
    { title: "Deep Sleep Meditation", uri: "https://www.youtube.com/results?search_query=deep+sleep+meditation" },
    { title: "Yoga for Relaxation", uri: "https://www.youtube.com/results?search_query=yoga+relaxation" }
  ];
};

export const findNearbySupport = async (coords: { latitude: number, longitude: number }): Promise<{ title: string, uri: string }[]> => {
  return [
    {
      title: "Find Mental Health Support on Maps",
      uri: `https://www.google.com/maps/search/psychiatrist/@${coords.latitude},${coords.longitude},13z`
    },
    {
      title: "Helpline Directory",
      uri: "https://findahelpline.com/"
    },
    {
      title: "Mental Health Resources",
      uri: "https://www.samhsa.gov/find-help"
    }
  ];
};

export const generateZenImage = async (mood: string): Promise<string | null> => {
  const FALLBACK_SCENES: Record<string, string> = {
    'Deep Calm': 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1920&q=80',
    'Cosmic Peace': 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=80',
    'Lush Forest': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80',
    'Desert Stillness': 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1920&q=80',
    'default': 'https://images.unsplash.com/photo-1528353518132-13119849add2?auto=format&fit=crop&w=1920&q=80'
  };

  try {
    if (mood.includes('water') || mood.includes('lake')) return FALLBACK_SCENES['Deep Calm'];
    if (mood.includes('nebula') || mood.includes('colors')) return FALLBACK_SCENES['Cosmic Peace'];
    if (mood.includes('forest') || mood.includes('moss')) return FALLBACK_SCENES['Lush Forest'];
    if (mood.includes('sand') || mood.includes('dunes')) return FALLBACK_SCENES['Desert Stillness'];
    return FALLBACK_SCENES['default'];
  } catch (e) {
    return FALLBACK_SCENES['default'];
  }
};

