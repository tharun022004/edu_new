import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveQuiz from './LiveQuiz';
import apiService from '../services/api';
import {
  PlayIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  StarIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ShareIcon,
  ChartBarIcon,
  BookOpenIcon,
  BeakerIcon,
  CalculatorIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  BoltIcon,
  SparklesIcon,
  GiftIcon,
  EyeIcon,
  ArrowPathIcon,
  BookmarkIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  FireIcon as FireIconSolid,
  StarIcon as StarIconSolid,
  TrophyIcon as TrophyIconSolid,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const toText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const nested = value.name ?? value.title ?? value.label ?? value.id ?? value.value;
    return typeof nested === 'object' ? toText(nested) : (nested ? String(nested) : '');
  }
  return String(value);
};

const Quiz = () => {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState('live'); // 'live' | 'practice'
  const [currentView, setCurrentView] = useState('home'); // home, topic-select, random, multiplayer, quiz, results
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [questionXP, setQuestionXP] = useState(0);
  const [streak, setStreak] = useState(7);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRandomMatching, setIsRandomMatching] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [multiplayerMode, setMultiplayerMode] = useState(''); // invite, join
  const [sameClassOnly, setSameClassOnly] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiKnowledge, setAiKnowledge] = useState([]);
  const [loadingAIKnowledge, setLoadingAIKnowledge] = useState(false);
  const [quizHistory, setQuizHistory] = useState([
    {
      id: 1,
      date: '2024-03-20',
      time: '14:30',
      subject: 'Physics',
      topic: 'Laws of Motion',
      mode: 'solo',
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      result: 'pass',
      xpEarned: 85,
      timeTaken: '4:32',
      difficulty: 'medium',
      questions: [
        { question: "What is Newton's First Law?", userAnswer: 0, correctAnswer: 0, isCorrect: true },
        { question: "Formula for kinetic energy?", userAnswer: 1, correctAnswer: 1, isCorrect: true },
        { question: "Which is a vector quantity?", userAnswer: 1, correctAnswer: 2, isCorrect: false },
      ]
    },
    {
      id: 2,
      date: '2024-03-19',
      time: '16:45',
      subject: 'Mathematics',
      topic: 'Calculus Basics',
      mode: 'friend',
      score: 7,
      totalQuestions: 10,
      percentage: 70,
      result: 'win',
      xpEarned: 75,
      timeTaken: '5:12',
      difficulty: 'hard',
      opponent: 'Sarah Kim',
      questions: []
    },
    {
      id: 3,
      date: '2024-03-18',
      time: '10:15',
      subject: 'Chemistry',
      topic: 'Organic Chemistry',
      mode: 'random',
      score: 9,
      totalQuestions: 10,
      percentage: 90,
      result: 'win',
      xpEarned: 95,
      timeTaken: '3:45',
      difficulty: 'easy',
      opponent: 'Alex Chen',
      questions: []
    },
    {
      id: 4,
      date: '2024-03-17',
      time: '19:20',
      subject: 'Biology',
      topic: 'Genetics',
      mode: 'solo',
      score: 6,
      totalQuestions: 10,
      percentage: 60,
      result: 'pass',
      xpEarned: 65,
      timeTaken: '6:18',
      difficulty: 'medium',
      questions: []
    },
    {
      id: 5,
      date: '2024-03-16',
      time: '13:55',
      subject: 'Physics',
      topic: 'Thermodynamics',
      mode: 'friend',
      score: 5,
      totalQuestions: 10,
      percentage: 50,
      result: 'loss',
      xpEarned: 55,
      timeTaken: '7:02',
      difficulty: 'hard',
      opponent: 'Mike Rodriguez',
      questions: []
    }
  ]);

  // Get subjects from available quizzes
  const subjects = React.useMemo(() => {
    const uniqueSubjects = [...new Set(availableQuizzes.map(quiz => quiz.subject))];
    return uniqueSubjects.map(subject => {
      const iconMap = {
        'Physics': '⚛️',
        'Chemistry': '🧪', 
        'Mathematics': '📐',
        'Biology': '🧬',
        'Computer Science': '💻',
        'English': '📚',
        'History': '🏛️'
      };
      return {
        id: subject.toLowerCase(),
        name: subject,
        icon: iconMap[subject] || '📚',
        color: 'from-purple-500 to-indigo-600'
      };
    });
  }, [availableQuizzes]);

  const chapters = React.useMemo(() => {
    const chaptersMap = {};
    availableQuizzes.forEach(quiz => {
      const subjectId = quiz.subject.toLowerCase();
      if (!chaptersMap[subjectId]) {
        chaptersMap[subjectId] = [];
      }
      if (quiz.topic && !chaptersMap[subjectId].find(ch => ch.id === quiz.topic.toLowerCase().replace(/\s+/g, '-'))) {
        chaptersMap[subjectId].push({
          id: quiz.topic.toLowerCase().replace(/\s+/g, '-'),
          name: quiz.topic
        });
      }
    });
    return chaptersMap;
  }, [availableQuizzes]);

  const aiSubjects = React.useMemo(() => {
    return [...new Set(aiKnowledge.map(item => toText(item.subject)).filter(Boolean))].sort();
  }, [aiKnowledge]);

  const getAIChapters = (subject) => {
    return [...new Set(
      aiKnowledge
        .filter(item => toText(item.subject).toLowerCase() === toText(subject).toLowerCase())
        .map(item => toText(item.chapter))
        .filter(Boolean)
    )].sort();
  };

  const getAITopics = (subject, chapter) => {
    return [...new Set(
      aiKnowledge
        .filter(item => toText(item.subject).toLowerCase() === toText(subject).toLowerCase() && toText(item.chapter).toLowerCase() === toText(chapter).toLowerCase())
        .map(item => toText(item.topic))
        .filter(topic => topic && topic !== 'General')
    )].sort();
  };

  const sampleQuiz = {
    questions: [
      {
        id: 1,
        question: "What is Newton's First Law of Motion?",
        options: [
          "An object at rest stays at rest",
          "Force equals mass times acceleration", 
          "For every action there is an equal and opposite reaction",
          "Energy cannot be created or destroyed"
        ],
        correct: 0,
        explanation: "Newton's First Law states that an object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force."
      },
      {
        id: 2,
        question: "What is the formula for kinetic energy?",
        options: [
          "KE = mgh",
          "KE = ½mv²",
          "KE = mc²",
          "KE = Fd"
        ],
        correct: 1,
        explanation: "Kinetic energy is calculated as KE = ½mv², where m is mass and v is velocity."
      },
      {
        id: 3,
        question: "Which of the following is a vector quantity?",
        options: [
          "Speed",
          "Mass",
          "Velocity",
          "Temperature"
        ],
        correct: 2,
        explanation: "Velocity is a vector quantity because it has both magnitude and direction, unlike speed which only has magnitude."
      }
    ]
  };

  const quizHistoryOld = [
    { id: 1, subject: 'Physics', score: 85, date: '2024-03-20', questions: 10 },
    { id: 2, subject: 'Chemistry', score: 92, date: '2024-03-19', questions: 15 },
    { id: 3, subject: 'Mathematics', score: 78, date: '2024-03-18', questions: 12 },
  ];

  // Fetch available quizzes on component mount
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        console.log('🔄 Fetching quizzes from API...');
        
        const response = await apiService.getQuizzes();
        console.log('📡 Quizzes API Response:', response);
        
        if (response.success) {
          setAvailableQuizzes(response.data || []);
          console.log('✅ Quizzes fetched successfully');
        } else {
          console.error('❌ API returned error:', response.message);
        }
      } catch (err) {
        console.error('❌ Error fetching quizzes:', err);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
  }, []);

  useEffect(() => {
    const fetchAIKnowledge = async () => {
      try {
        setLoadingAIKnowledge(true);
        const response = await fetch(`${AI_BASE_URL}/knowledge`);
        const data = await response.json();
        if (response.ok) {
          setAiKnowledge(data.items || []);
        } else {
          console.error('AI knowledge API returned error:', data.detail);
        }
      } catch (err) {
        console.error('Error fetching AI knowledge:', err);
      } finally {
        setLoadingAIKnowledge(false);
      }
    };

    fetchAIKnowledge();
  }, []);

  // Timer effect
  useEffect(() => {
    if (currentView === 'quiz' && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleNextQuestion();
    }
  }, [timeLeft, currentView, showResult]);

  const handleGenerateAIQuiz = async (subject, chapter, topic = '') => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`${AI_BASE_URL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, chapter, topic: topic || undefined })
      });
      const data = await response.json();

      if (response.ok && data.quiz && data.quiz.length > 0) {
        const transformedQuiz = {
          questions: data.quiz.map((q, index) => {
            const optionsArr = Array.isArray(q.options) ? q.options.map(o => (typeof o === 'object' ? (o.text ?? String(o)) : String(o))) : [];
            let correctIndex = 0;

            // Case 1: answer provided as numeric index
            if (typeof q.answer === 'number' && q.answer >= 0 && q.answer < optionsArr.length) {
              correctIndex = q.answer;
            }

            // Case 2: answer provided as option text
            if ((typeof q.answer === 'string' || typeof q.answer === 'object') && optionsArr.length) {
              const ansText = typeof q.answer === 'string' ? q.answer : String(q.answer);
              const txtIdx = optionsArr.indexOf(ansText);
              if (txtIdx !== -1) correctIndex = txtIdx;
            }

            // Case 3: some sources include `correct` field
            if (typeof q.correct === 'number' && q.correct >= 0 && q.correct < optionsArr.length) {
              correctIndex = q.correct;
            }

            return {
              id: index,
              question: q.question,
              options: optionsArr,
              correct: correctIndex,
              explanation: `Correct answer: ${q.answer}`
            };
          })
        };
        setQuizData(transformedQuiz);
        setCurrentQuestion(0);
        setScore(0);
        setTimeLeft(30);
        setSelectedAnswer(null);
        setShowResult(false);
        setSelectedSubject(subject);
        setSelectedChapter(topic || chapter);
        setCurrentView('quiz');
        if (soundEnabled) toast.success('AI quiz generated!');
      } else {
        toast.error(data.detail || 'Failed to generate AI quiz.');
      }
    } catch (err) {
      toast.error('Failed to connect to AI Service.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const startQuiz = async (type, options = {}) => {
    setIsLoading(true);
    
    try {
      console.log('🔄 Starting quiz...', { type, options });
      
      let selectedQuiz = null;
      
      if (type === 'topic' && options.subject && options.chapter) {
        // Find quiz by subject and topic
        selectedQuiz = availableQuizzes.find(quiz => 
          quiz.subject.toLowerCase() === options.subject && 
          quiz.topic.toLowerCase().replace(/\s+/g, '-') === options.chapter
        );
      } else if (type === 'random') {
        // Select random quiz
        selectedQuiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];
      } else if (availableQuizzes.length > 0) {
        // Use first available quiz
        selectedQuiz = availableQuizzes[0];
      }
      
      if (selectedQuiz) {
        console.log('📡 Using quiz from backend:', selectedQuiz);
        
        // Transform backend quiz data to match frontend structure
        const transformedQuiz = {
          questions: selectedQuiz.questions?.map((q, index) => {
            const optionsArr = q.options?.map(opt => (typeof opt === 'object' ? (opt.text ?? String(opt)) : String(opt))) || [];
            let correctIndex = 0;

            // Prefer explicit correctAnswer string
            if (q.correctAnswer && typeof q.correctAnswer === 'string') {
              const idx = optionsArr.indexOf(q.correctAnswer);
              if (idx !== -1) correctIndex = idx;
            }

            // Fall back to options[].isCorrect boolean
            const isCorrectIdx = Array.isArray(q.options) ? q.options.findIndex(opt => opt && opt.isCorrect) : -1;
            if (isCorrectIdx !== -1) correctIndex = isCorrectIdx;

            // Ensure valid index
            if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= optionsArr.length) correctIndex = 0;

            return {
              id: q._id || index,
              question: q.question,
              options: optionsArr,
              correct: correctIndex,
              explanation: q.explanation || 'No explanation available'
            };
          }) || sampleQuiz.questions
        };
        
        setQuizData(transformedQuiz);
      } else {
        // Fallback to sample quiz if no backend quizzes available
        console.log('📡 Using sample quiz as fallback');
        setQuizData(sampleQuiz);
      }
      
      setCurrentQuestion(0);
      setScore(0);
      setTimeLeft(30);
      setSelectedAnswer(null);
      setShowResult(false);
      setCurrentView('quiz');
      
      if (soundEnabled) {
        toast.success('Quiz started! Good luck! 🚀');
      }
    } catch (err) {
      console.error('❌ Error starting quiz:', err);
      toast.error('Failed to start quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setIsAnswerSubmitted(true);
    setShowExplanation(true);
    
    const isCorrect = selectedAnswer === quizData.questions[currentQuestion].correct;
    const earnedXP = isCorrect ? 10 : 5;
    setQuestionXP(earnedXP);
    
    if (isCorrect) {
      setScore(score + 1);
      if (soundEnabled) toast.success('🎉 Correct! +' + earnedXP + ' XP');
    } else {
      if (soundEnabled) toast.error('❌ Good try! +' + earnedXP + ' XP');
    }
    
    // Auto-advance after 3 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 3000);
  };
  const handleNextQuestion = () => {
    if (currentQuestion + 1 < quizData.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsAnswerSubmitted(false);
      setQuestionXP(0);
      setTimeLeft(30);
    } else {
      setCurrentView('results');
      setShowResult(true);
      
      // Add to quiz history
      const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        subject: selectedSubject || 'Mixed Topics',
        topic: selectedChapter || 'Random Challenge',
        mode: 'solo',
        score: score,
        totalQuestions: quizData.questions.length,
        percentage: Math.round((score / quizData.questions.length) * 100),
        result: Math.round((score / quizData.questions.length) * 100) >= 60 ? 'pass' : 'fail',
        xpEarned: score * 10 + (quizData.questions.length - score) * 5,
        timeTaken: '4:30', // This would be calculated from actual time
        difficulty: selectedDifficulty || 'medium',
        questions: quizData.questions.map((q, index) => ({
          question: q.question,
          userAnswer: index === currentQuestion ? selectedAnswer : Math.floor(Math.random() * 4),
          correctAnswer: q.correct,
          isCorrect: index === currentQuestion ? selectedAnswer === q.correct : Math.random() > 0.3
        }))
      };
      
      setQuizHistory([newHistoryEntry, ...quizHistory]);
    }
  };

  const handleRandomPlay = async () => {
    setIsRandomMatching(true);
    
    // Simulate finding a player
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 80% chance of finding a player
    if (Math.random() > 0.2) {
      setIsRandomMatching(false);
      toast.success('Player found! Starting battle...');
      startQuiz('random');
    } else {
      setIsRandomMatching(false);
      toast.error('No players online right now. Try again or invite a friend!');
    }
  };

  const handleBookmarkQuestion = () => {
    const questionId = quizData.questions[currentQuestion].id;
    if (!bookmarkedQuestions.includes(questionId)) {
      setBookmarkedQuestions([...bookmarkedQuestions, questionId]);
      toast.success('📚 Question bookmarked for revision!');
    }
  };
  const generateGameCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    toast.success(`Game code generated: ${code}`);
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'solo': return '🎓';
      case 'friend': return '🧑‍🤝‍🧑';
      case 'random': return '🎯';
      default: return '📚';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'win': return 'text-green-600 bg-green-50';
      case 'loss': return 'text-red-600 bg-red-50';
      case 'tie': return 'text-yellow-600 bg-yellow-50';
      case 'pass': return 'text-blue-600 bg-blue-50';
      case 'fail': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const retakeQuiz = (historyItem) => {
    setSelectedSubject(historyItem.subject.toLowerCase());
    setSelectedChapter(historyItem.topic.toLowerCase().replace(/\s+/g, '-'));
    setSelectedDifficulty(historyItem.difficulty);
    startQuiz('topic', { 
      subject: historyItem.subject.toLowerCase(), 
      chapter: historyItem.topic.toLowerCase().replace(/\s+/g, '-'), 
      difficulty: historyItem.difficulty 
    });
  };

  const AiSetupScreen = () => {
    const [subject, setSubject] = useState('');
    const [chapter, setChapter] = useState('');
    const [topic, setTopic] = useState('');
    const availableChapters = getAIChapters(subject);
    const availableTopics = getAITopics(subject, chapter);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI Quiz Generator</h2>
          <div className="space-y-4">
            {loadingAIKnowledge ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                Loading AI knowledge...
              </div>
            ) : aiSubjects.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                No AI knowledge has been added yet. Ask your teacher to add chapters in AI Tools first.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={e => {
                      setSubject(e.target.value);
                      setChapter('');
                      setTopic('');
                    }}
                    className="w-full px-4 py-2 border rounded-xl bg-white"
                  >
                    <option value="">Select subject</option>
                    {aiSubjects.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                  <select
                    value={chapter}
                    onChange={e => {
                      setChapter(e.target.value);
                      setTopic('');
                    }}
                    disabled={!subject}
                    className="w-full px-4 py-2 border rounded-xl bg-white disabled:bg-gray-100"
                  >
                    <option value="">Select chapter</option>
                    {availableChapters.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    disabled={!chapter || availableTopics.length === 0}
                    className="w-full px-4 py-2 border rounded-xl bg-white disabled:bg-gray-100"
                  >
                    <option value="">All topics in this chapter</option>
                    {availableTopics.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <button
              onClick={() => handleGenerateAIQuiz(subject, chapter, topic)}
              disabled={isGeneratingAI || !subject || !chapter || aiSubjects.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGeneratingAI ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
              {isGeneratingAI ? 'Generating...' : 'Generate Quiz'}
            </button>
            <button onClick={() => setCurrentView('home')} className="w-full py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // Quiz Home Screen
  const QuizHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full shadow-lg">
              <AcademicCapIcon className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Ready to Test Your Knowledge?
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Challenge yourself with interactive quizzes and compete with friends!
          </p>
        </div>

        {/* Streak & Stats */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center space-x-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FireIconSolid className="h-8 w-8 text-orange-500 mr-2" />
                <span className="text-3xl font-bold text-orange-600">{streak}</span>
              </div>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrophyIconSolid className="h-8 w-8 text-yellow-500 mr-2" />
                <span className="text-3xl font-bold text-yellow-600">1,250</span>
              </div>
              <p className="text-sm text-gray-600">Total XP</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <StarIconSolid className="h-8 w-8 text-purple-500 mr-2" />
                <span className="text-3xl font-bold text-purple-600">15</span>
              </div>
              <p className="text-sm text-gray-600">Badges</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <span className="text-xl">📜</span>
              <span className="font-semibold">Quiz History</span>
            </button>
            <button className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
              <span className="text-xl">🏅</span>
              <span className="font-semibold">Leaderboard</span>
            </button>
          </div>
        </div>

        {/* Quiz Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Select by Topic */}
          <div
            onClick={() => setCurrentView('topic-select')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-white text-center">
              <BookOpenIcon className="h-16 w-16 mx-auto mb-4 group-hover:animate-bounce" />
              <h3 className="text-2xl font-bold mb-2">📚 Select by Topic</h3>
              <p className="text-blue-100">Sharpen your focus by subject</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-gray-600">
                <span>Choose your battlefield</span>
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Random Challenge */}
          <div 
            onClick={() => setCurrentView('random')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-green-500 to-teal-600 p-8 text-white text-center">
              <BoltIcon className="h-16 w-16 mx-auto mb-4 group-hover:animate-spin" />
              <h3 className="text-2xl font-bold mb-2">🎲 Random Challenge</h3>
              <p className="text-green-100">Test your brain with mixed topics!</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-gray-600">
                <span>Surprise me!</span>
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Play with Friend */}
          <div 
            onClick={() => setCurrentView('multiplayer')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-8 text-white text-center">
              <UserGroupIcon className="h-16 w-16 mx-auto mb-4 group-hover:animate-pulse" />
              <h3 className="text-2xl font-bold mb-2">👥 Play with Friend</h3>
              <p className="text-purple-100">Duel your buddy – winner takes glory!</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-gray-600">
                <span>Challenge accepted!</span>
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* AI Quiz Generator */}
          <div
            onClick={() => setCurrentView('ai-setup')}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white text-center">
              <SparklesIcon className="h-16 w-16 mx-auto mb-4 group-hover:animate-pulse" />
              <h3 className="text-2xl font-bold mb-2">AI Generator</h3>
              <p className="text-indigo-100">Create instant quizzes</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-gray-600">
                <span>Magic creation</span>
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Challenge & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Daily Challenge */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 text-white shadow-lg">
            <div className="flex items-center mb-4">
              <GiftIcon className="h-8 w-8 mr-3" />
              <h3 className="text-2xl font-bold">🎮 Challenge of the Day</h3>
            </div>
            <p className="text-yellow-100 mb-6">Complete today's challenge and earn double XP!</p>
            <button className="bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              Start Challenge
            </button>
          </div>

          {/* Quick Leaderboard */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">🏅 Top Performers</h3>
              <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Alex Chen', score: 2450, rank: 1 },
                { name: 'Sarah Kim', score: 2380, rank: 2 },
                { name: 'You', score: 1250, rank: 3, isUser: true },
              ].map((player) => (
                <div key={player.rank} className={`flex items-center space-x-4 p-3 rounded-lg ${player.isUser ? 'bg-indigo-50 border border-indigo-200' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    player.rank === 2 ? 'bg-gray-100 text-gray-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {player.rank}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${player.isUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {player.name}
                    </p>
                    <p className="text-sm text-gray-500">{player.score} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sound Toggle */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-4 rounded-full shadow-lg transition-all ${
              soundEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {soundEnabled ? <SpeakerWaveIcon className="h-6 w-6" /> : <SpeakerXMarkIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );

  // Quiz History Screen
  const QuizHistoryScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => setShowHistory(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-4"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📜 Quiz History</h1>
            <p className="text-gray-600">Track your learning progress and achievements</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quizzes</p>
                <h3 className="text-2xl font-bold text-indigo-600">{quizHistory.length}</h3>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <h3 className="text-2xl font-bold text-green-600">
                  {Math.round(quizHistory.reduce((acc, quiz) => acc + quiz.percentage, 0) / quizHistory.length)}%
                </h3>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total XP</p>
                <h3 className="text-2xl font-bold text-purple-600">
                  {quizHistory.reduce((acc, quiz) => acc + quiz.xpEarned, 0)}
                </h3>
              </div>
              <div className="text-3xl">⭐</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <h3 className="text-2xl font-bold text-orange-600">
                  {Math.round((quizHistory.filter(q => q.result === 'win' || q.result === 'pass').length / quizHistory.length) * 100)}%
                </h3>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          </div>
        </div>

        {/* Quiz History List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Quizzes</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {quizHistory.map((quiz) => (
              <div key={quiz.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{getModeIcon(quiz.mode)}</div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{quiz.subject}</h3>
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{quiz.topic}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {quiz.date} at {quiz.time}
                        </span>
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {quiz.timeTaken}
                        </span>
                        <span className="capitalize">{quiz.difficulty}</span>
                        {quiz.opponent && (
                          <span className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 mr-1" />
                            vs {quiz.opponent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Score */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {quiz.score}/{quiz.totalQuestions}
                      </div>
                      <div className="text-sm text-gray-500">{quiz.percentage}%</div>
                    </div>
                    
                    {/* Result Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getResultColor(quiz.result)}`}>
                      {quiz.result === 'win' && '🏆 Win'}
                      {quiz.result === 'loss' && '😔 Loss'}
                      {quiz.result === 'tie' && '🤝 Tie'}
                      {quiz.result === 'pass' && '✅ Pass'}
                      {quiz.result === 'fail' && '❌ Fail'}
                    </div>
                    
                    {/* XP Earned */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">+{quiz.xpEarned}</div>
                      <div className="text-xs text-gray-500">XP</div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => retakeQuiz(quiz)}
                        className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        <span>Retake</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                        <EyeIcon className="h-4 w-4" />
                        <span>Review</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <ShareIcon className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100 transition-colors">
                        <StarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Topic Selection Screen
  const TopicSelection = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => setCurrentView('home')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-4"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Topic</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedSubject ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${selectedSubject ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedChapter ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className={`w-16 h-1 ${selectedChapter ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedDifficulty ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Subject Selection */}
        {!selectedSubject && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Step 1: Choose Subject</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${subject.color} p-8 text-white text-center`}>
                    <div className="text-4xl mb-4">{subject.icon}</div>
                    <h3 className="text-2xl font-bold">{subject.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Chapter Selection */}
        {selectedSubject && !selectedChapter && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Step 2: Choose Chapter</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chapters[selectedSubject]?.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => setSelectedChapter(chapter.id)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{chapter.name}</h3>
                  <p className="text-gray-600">Test your knowledge on this topic</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Difficulty Selection */}
        {selectedSubject && selectedChapter && !selectedDifficulty && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Step 3: Choose Difficulty</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'easy', name: 'Easy', color: 'from-green-400 to-green-600', icon: '😊' },
                { id: 'medium', name: 'Medium', color: 'from-yellow-400 to-orange-500', icon: '🤔' },
                { id: 'hard', name: 'Hard', color: 'from-red-400 to-red-600', icon: '🔥' },
              ].map((difficulty) => (
                <div
                  key={difficulty.id}
                  onClick={() => {
                    setSelectedDifficulty(difficulty.id);
                    startQuiz('topic', { subject: selectedSubject, chapter: selectedChapter, difficulty: difficulty.id });
                  }}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${difficulty.color} p-8 text-white text-center`}>
                    <div className="text-4xl mb-4">{difficulty.icon}</div>
                    <h3 className="text-2xl font-bold">{difficulty.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Random Quiz Screen
  const RandomQuiz = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <button
          onClick={() => setCurrentView('home')}
          className="absolute top-8 left-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-12">
          <div className="animate-spin text-8xl mb-8">🎲</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Random Challenge</h1>
          <p className="text-xl text-gray-600 mb-8">Let fate decide your quiz topics!</p>
          
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
              <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>5 Questions</option>
                <option>10 Questions</option>
                <option>15 Questions</option>
                <option>20 Questions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>Mixed Difficulty</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => startQuiz('random')}
            className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-12 py-4 rounded-2xl text-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🎯 Generate My Challenge
          </button>
        </div>
      </div>
    </div>
  );

  // Multiplayer Screen
  const MultiplayerScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setCurrentView('home')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-8"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">👥 Battle Arena</h1>
          <p className="text-xl text-gray-600">Challenge your friends to an epic quiz duel!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Game */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🔗 Create Game</h3>
              <p className="text-gray-600">Invite friends with a game code</p>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {gameCode && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-purple-600 mb-2">Game Code:</p>
                  <p className="text-2xl font-bold text-purple-800">{gameCode}</p>
                </div>
              )}
            </div>

            <button
              onClick={generateGameCode}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300"
            >
              Generate Game Code
            </button>
          </div>

          {/* Join Game */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <PlayIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🧑‍🤝‍🧑 Join Game</h3>
              <p className="text-gray-600">Enter your friend's game code</p>
            </div>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Enter game code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-xl font-bold"
              />
            </div>

            <button
              onClick={() => toast.success('Joining game...')}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-700 transition-all duration-300"
            >
              Join Battle
            </button>
          </div>

          {/* Random Play */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:col-span-2">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BoltIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🎯 Random Play</h3>
              <p className="text-gray-600">Match with any online student instantly</p>
            </div>

            <div className="max-w-md mx-auto space-y-4 mb-6">
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="sameClass"
                  checked={sameClassOnly}
                  onChange={(e) => setSameClassOnly(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="sameClass" className="text-sm text-gray-600">
                  Same class only
                </label>
              </div>
            </div>

            {isRandomMatching ? (
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">🎯</div>
                <p className="text-gray-600 mb-4">Finding a player...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRandomPlay}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300"
              >
                🚀 Find Random Opponent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Quiz Screen
  const QuizScreen = () => {
    const question = quizData?.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quizData?.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('home')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full px-4 py-2 shadow-md">
                <span className="text-sm font-medium text-gray-600">
                  {currentQuestion + 1} / {quizData?.questions.length}
                </span>
              </div>
              <div className={`bg-white rounded-full px-4 py-2 shadow-md flex items-center space-x-2 ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
                <ClockIcon className={`h-5 w-5 ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-600'}`} />
                <span className={`font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center leading-relaxed">
              {question?.question}
            </h2>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswerSubmitted}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left hover:scale-105 ${
                    isAnswerSubmitted
                      ? index === question.correct
                        ? 'border-green-500 bg-green-50 shadow-lg'
                        : selectedAnswer === index
                        ? 'border-red-500 bg-red-50 shadow-lg'
                        : 'border-gray-200 bg-gray-50'
                      : selectedAnswer === index
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                      isAnswerSubmitted
                        ? index === question.correct
                          ? 'border-green-500 bg-green-500 text-white'
                          : selectedAnswer === index
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-gray-300 text-gray-600'
                        : selectedAnswer === index
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-gray-300 text-gray-600'
                    }`}>
                      {isAnswerSubmitted && index === question.correct && '✅'}
                      {isAnswerSubmitted && selectedAnswer === index && index !== question.correct && '❌'}
                      {!isAnswerSubmitted && String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-lg font-medium text-gray-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Answer Explanation */}
            {showExplanation && (
              <div className="mt-8 animate-fadeIn">
                <div className={`p-6 rounded-xl border-l-4 ${
                  selectedAnswer === question.correct
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {selectedAnswer === question.correct ? '🎉' : '💡'}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg mb-2 ${
                        selectedAnswer === question.correct ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {selectedAnswer === question.correct ? 'Correct! Well done!' : 'Good try! Here\'s why:'}
                      </h4>
                      <p className="text-gray-700 mb-4">{question.explanation}</p>
                      
                      {questionXP > 0 && (
                        <div className="flex items-center space-x-4">
                          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                            +{questionXP} XP
                          </div>
                          <button
                            onClick={handleBookmarkQuestion}
                            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm"
                          >
                            <BookmarkIcon className="h-4 w-4" />
                            <span>Bookmark for revision</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => handleNextQuestion()}
              className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Skip Question
            </button>
            
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  selectedAnswer !== null
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-300"
              >
                {currentQuestion + 1 === quizData?.questions.length ? 'View Results' : 'Next Question'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Results Screen
  const ResultsScreen = () => {
    const percentage = Math.round((score / quizData?.questions.length) * 100);
    const isExcellent = percentage >= 80;
    const isGood = percentage >= 60;
    const totalXP = score * 10 + (quizData?.questions.length - score) * 5;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12">
            {/* Animated Score */}
            <div className="mb-8">
              <div className={`text-8xl mb-4 ${isExcellent ? 'animate-bounce' : ''}`}>
                {isExcellent ? '🏆' : isGood ? '🎉' : '💪'}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {isExcellent ? 'Excellent!' : isGood ? 'Well Done!' : 'Keep Trying!'}
              </h1>
              <div className="text-6xl font-bold text-indigo-600 mb-4">
                {percentage}%
              </div>
              <p className="text-xl text-gray-600">
                You scored {score} out of {quizData?.questions.length} questions
              </p>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Performance Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{score}</div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{quizData?.questions.length - score}</div>
                  <div className="text-sm text-gray-600">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2.5min</div>
                  <div className="text-sm text-gray-600">Avg Time</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => setCurrentView('home')}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
              >
                🏠 Back to Home
              </button>
              <button
                onClick={() => {
                  setCurrentQuestion(0);
                  setScore(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  setIsAnswerSubmitted(false);
                  setTimeLeft(30);
                  setCurrentView('quiz');
                }}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5 inline mr-2" />
                Retry Quiz
              </button>
              <button
                onClick={() => toast.success('Results shared!')}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <ShareIcon className="h-5 w-5 inline mr-2" />
                Share Result
              </button>
            </div>

            {/* XP Gained */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-center space-x-3">
                <SparklesIcon className="h-8 w-8" />
                <span className="text-2xl font-bold">+{totalXP} XP Earned!</span>
                <SparklesIcon className="h-8 w-8" />
              </div>
              <p className="text-center mt-2 text-yellow-100">
                {bookmarkedQuestions.length > 0 && `📚 ${bookmarkedQuestions.length} questions bookmarked for revision`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading Screen
  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-8">🧠</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Preparing Your Quiz...</h2>
        <p className="text-gray-600">Generating awesome questions just for you!</p>
      </div>
    </div>
  );

  // Render based on current view
  if (isLoading) return <LoadingScreen />;

  // ─── Tab Switcher ───────────────────────────────
  // Show tab bar unless we're deep into a quiz/history screen in practice mode
  const inPracticeSubview = showHistory || ['quiz', 'results', 'topic-select', 'random', 'multiplayer'].includes(currentView);

  return (
    <div>
      {/* Tab bar - hidden when inside a deep sub-view in practice mode */}
      {!inPracticeSubview && (
        <div className="max-w-6xl mx-auto px-4 pt-4 mb-0">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setMainTab('live')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                mainTab === 'live' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🏆 Live Quizzes
            </button>
            <button
              onClick={() => setMainTab('practice')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                mainTab === 'practice' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🎓 Practice Mode
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {mainTab === 'live' && !inPracticeSubview ? (
        <LiveQuiz />
      ) : (
        (() => {
          if (showHistory) return <QuizHistoryScreen />;
          switch (currentView) {
            case 'ai-setup': return <AiSetupScreen />;
            case 'topic-select': return <TopicSelection />;
            case 'random': return <RandomQuiz />;
            case 'multiplayer': return <MultiplayerScreen />;
            case 'quiz': return <QuizScreen />;
            case 'results': return <ResultsScreen />;
            default: return <QuizHome />;
          }
        })()
      )}
    </div>
  );
};

export default Quiz;
