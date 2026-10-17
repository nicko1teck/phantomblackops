/* =========================================================
   QUICK MESSAGES - the tap-to-say buttons in every chat
   ---------------------------------------------------------
   Edit freely! Each category has:
     id    - a short name (no spaces)
     icon  - the emoji on the tab
     label - the word on the tab
     messages - the buttons (put an emoji first, it's easier to spot)
   Save the file and refresh the page to see changes.
   ========================================================= */
window.IMF_QUICK_MESSAGES = {
  // Shown in the "Favorites" tab until real favorites are learned
  starterFavorites: [
    "👋 Hi!",
    "✅ Yes",
    "❌ No",
    "🏃 On my way!",
    "😂 LOL",
    "👍 OK",
  ],

  categories: [
    {
      id: "hello",
      icon: "👋",
      label: "Hi & Bye",
      messages: [
        "👋 Hi!",
        "😎 What's up?",
        "☀️ Good morning!",
        "🌙 Good night!",
        "👋 Bye!",
        "⏰ Talk later!",
        "❤️ Love you!",
        "🤗 Miss you!",
      ],
    },
    {
      id: "answers",
      icon: "✅",
      label: "Answers",
      messages: [
        "✅ Yes",
        "❌ No",
        "👍 OK",
        "🤔 Maybe",
        "🤷 I don't know",
        "🏃 On my way!",
        "⏳ Wait for me",
        "🏠 I'm home",
        "👌 Sounds good",
        "🙏 Thank you!",
      ],
    },
    {
      id: "questions",
      icon: "❓",
      label: "Questions",
      messages: [
        "📍 Where are you?",
        "🤔 What are you doing?",
        "🎮 Can you play?",
        "⏰ What time?",
        "🏃 Are you coming?",
        "🍕 What's for dinner?",
        "📞 Can you video call?",
        "🙋 Can I come over?",
      ],
    },
    {
      id: "fun",
      icon: "😂",
      label: "Feelings & Fun",
      messages: [
        "😂 LOL",
        "😄 I'm happy!",
        "😢 I'm sad",
        "😴 I'm tired",
        "🤩 Awesome!",
        "😮 Whoa!",
        "😡 Grr!",
        "🥳 Party time!",
        "💩 Poop",
        "🔥 That's fire!",
      ],
    },
    {
      id: "spy",
      icon: "🕵️",
      label: "Spy Talk",
      messages: [
        "🕵️ Mission accepted",
        "🦅 The eagle has landed",
        "🚨 Abort mission!",
        "🤫 Top secret!",
        "📡 Do you copy?",
        "✅ Copy that",
        "🎯 Target spotted",
        "🔒 Meet at HQ",
        "💣 This message will self-destruct",
      ],
    },
    {
      id: "help",
      icon: "🆘",
      label: "Help",
      messages: [
        "🆘 I need help",
        "🙋 Come here please",
        "📞 Call me",
        "🤕 I got hurt",
        "😟 I'm scared",
        "🚗 Pick me up please",
      ],
    },
  ],
};
