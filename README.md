# 🎯 GoalGenius - AI-Powered Progress Tracking & Life Balance Platform

GoalGenius is an intelligent progress tracking application that uses AI to help users achieve their goals while maintaining a balanced lifestyle. Simply tell the AI your goals, and it generates personalized schedules, tracks your progress, and provides insights to keep you on track.

## ✨ Key Features

### 🤖 AI-Powered Goal Planning
- **Natural Language Goal Input**: Simply chat with AI about your goals
- **Intelligent Schedule Generation**: AI creates personalized daily/weekly schedules
- **Smart Task Breakdown**: Converts complex goals into manageable tasks
- **Hugging Face AI Integration**: Powered by advanced language models for intelligent responses

### 📊 Comprehensive Progress Tracking
- **Streak Counter**: Track consecutive days of goal completion
- **Category-wise Organization**: Organize tasks by work, health, leisure, social, and learning
- **Real-time Progress Updates**: See your completion rates and trends
- **Visual Progress Indicators**: Beautiful charts and meters to visualize your journey

### ⚖️ Life Balance Monitoring
- **Balance Meter**: Real-time scoring of your daily life balance
- **Multi-dimensional Analysis**: Tracks work, health, productivity, leisure, and social activities
- **AI-Powered Suggestions**: Get personalized recommendations for better balance
- **Daily Balance Scores**: See how balanced your day was across all life areas

### 📅 Smart Calendar Management
- **AI-Generated Events**: Automatic schedule creation from your goals
- **Manual Event Addition**: Add custom events and tasks
- **Category Color Coding**: Visual organization by activity type
- **Completion Tracking**: Mark tasks as complete with one click

### 📈 Advanced Analytics
- **Performance Insights**: Detailed analysis of your progress patterns
- **Trend Analysis**: Track improvements over time
- **AI Recommendations**: Personalized suggestions for optimization
- **Weekly/Monthly Reports**: Comprehensive progress summaries

### 🎨 Modern User Experience
- **Light/Dark Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Notifications**: Stay updated on your progress
- **Intuitive Navigation**: Easy-to-use interface with clear sections

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive styling
- **Radix UI** components for accessible design
- **React Query** for efficient data fetching
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express for the API server
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** (Neon) for reliable data storage
- **WebSocket** support for real-time features
- **JWT** authentication for secure user sessions

### AI Integration
- **Hugging Face Inference API** for AI-powered features
- **Mistral-7B-Instruct** model for intelligent responses
- **Context-aware conversations** for personalized interactions
- **Fallback mechanisms** for reliable AI responses

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- Hugging Face API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nandininema07/goalgenius.git
   cd goalgenius
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   HUGGING_FACE_API_KEY=your_hf_api_key
   JWT_SECRET=your_jwt_secret
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 How to Use

### 1. Create Your Account
- Sign up with email and password
- Complete your profile setup

### 2. Set Your Goals
- Navigate to the AI Chat section
- Tell the AI about your goals in natural language
- Example: "I want to learn React in 2 months while maintaining my workout routine"

### 3. Review Your Schedule
- AI generates a personalized schedule
- Review and adjust events as needed
- Add manual events through the calendar

### 4. Track Your Progress
- Mark tasks as complete throughout the day
- Monitor your balance meter for life harmony
- Check your streak counter for motivation

### 5. Analyze and Improve
- Review analytics for insights
- Get AI suggestions for optimization
- Adjust your goals and schedule as needed

## 🎯 Core Features Explained

### AI Chat Interface
The AI chat allows you to:
- **Create Goals**: "I want to learn Python and build a web app"
- **Generate Schedules**: AI creates daily/weekly plans
- **Get Suggestions**: Receive personalized recommendations
- **Ask Questions**: Get help with goal planning and time management

### Balance Meter
The balance meter provides:
- **Real-time Scoring**: 0-100% balance score
- **Category Breakdown**: Work, health, leisure, social, learning percentages
- **Visual Feedback**: Color-coded progress indicators
- **Daily Tracking**: Monitor balance trends over time

### Streak System
- **Consecutive Days**: Track how many days you've completed tasks
- **Motivation**: Visual flame indicator for current streak
- **Longest Streak**: Record your best performance
- **Daily Updates**: Automatic streak calculation

### Calendar Integration
- **AI-Generated Events**: Automatic schedule creation
- **Manual Addition**: Add custom events and tasks
- **Category Organization**: Color-coded by activity type
- **Completion Tracking**: Easy task completion marking

## 🔧 Technical Features

### Database Schema
- **Users**: Authentication and profile management
- **Goals**: Goal tracking with categories and priorities
- **Events**: Schedule items with time tracking
- **Daily Balance**: Balance scores and category breakdowns
- **Streaks**: Progress tracking and motivation
- **Chat Messages**: AI conversation history

### API Endpoints
- **Authentication**: Login, register, JWT validation
- **Goals**: CRUD operations for goal management
- **Events**: Schedule management and completion tracking
- **Analytics**: Progress analysis and balance calculations
- **AI Services**: Chat, schedule generation, suggestions

### Real-time Features
- **WebSocket Integration**: Live updates and notifications
- **Progress Tracking**: Real-time completion status
- **Balance Updates**: Live balance meter calculations
- **Streak Monitoring**: Instant streak updates

## 🎨 UI/UX Features

### Theme System
- **Light Mode**: Clean, bright interface for daytime use
- **Dark Mode**: Easy on the eyes for evening work
- **System Preference**: Automatic theme switching
- **Smooth Transitions**: Elegant theme changes

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Easy interaction on mobile devices
- **Adaptive Layout**: Components adjust to screen size
- **Accessibility**: WCAG compliant design

### Visual Feedback
- **Loading States**: Clear indication of processing
- **Success/Error Messages**: Toast notifications
- **Progress Indicators**: Visual feedback for actions
- **Hover Effects**: Interactive element feedback

## 🔒 Security Features

- **JWT Authentication**: Secure user sessions
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Secure cross-origin requests

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_db_url
HUGGING_FACE_API_KEY=your_hf_api_key
JWT_SECRET=your_secure_jwt_secret
PORT=3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** for AI model integration
- **Radix UI** for accessible component library
- **Tailwind CSS** for utility-first styling
- **Drizzle ORM** for type-safe database operations
- **React Query** for efficient data management

## 📞 Support

For support, email support@goalgenius.com or create an issue in the GitHub repository.

---

**GoalGenius** - Transform your goals into reality with AI-powered progress tracking and life balance optimization. 🎯✨ 