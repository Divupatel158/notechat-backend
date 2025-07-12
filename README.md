# NoteChat Backend API

A robust Node.js backend API for the NoteChat application, featuring real-time messaging, user authentication, and note management using Supabase as the database.

## 🚀 Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Real-time Chat**: WebSocket-like functionality with polling for real-time messaging
- **Note Management**: CRUD operations for notes with user-specific data
- **Email Integration**: Nodemailer for email notifications
- **SMS Integration**: Twilio for SMS notifications
- **Database**: Supabase (PostgreSQL) for data persistence
- **Security**: Input validation, CORS, and secure headers

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project
- (Optional) Twilio account for SMS features
- (Optional) Email service for notifications

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key_here

# Server Configuration
PORT=5001
NODE_ENV=development

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 4. Database Setup

#### Create Supabase Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Users Table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  uname VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes Table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  tag VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for notes table
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user);

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user);
```

### 5. Run the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Test Connection
```bash
npm test
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/createuser
Content-Type: application/json

{
  "name": "John Doe",
  "uname": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get User Details
```http
POST /api/auth/getuser
Headers: {
  "auth-token": "your_jwt_token_here"
}
```

#### Delete User
```http
DELETE /api/auth/deleteuser/:id
Headers: {
  "auth-token": "your_jwt_token_here"
}
```

### Notes Endpoints

#### Get All Notes
```http
GET /api/notes/fetchallnotes
Headers: {
  "auth-token": "your_jwt_token_here"
}
```

#### Add Note
```http
POST /api/notes/addnote
Headers: {
  "auth-token": "your_jwt_token_here"
}
Content-Type: application/json

{
  "title": "Note Title",
  "description": "Note content here",
  "tag": "personal"
}
```

#### Update Note
```http
PUT /api/notes/updatenote/:id
Headers: {
  "auth-token": "your_jwt_token_here"
}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated content",
  "tag": "work"
}
```

#### Delete Note
```http
DELETE /api/notes/deletenote/:id
Headers: {
  "auth-token": "your_jwt_token_here"
}
```

## 🔐 Authentication

All protected routes require an `auth-token` header containing a valid JWT token obtained from the login endpoint.

## 📁 Project Structure

```
backend/
├── middleware/
│   └── fetchuser.js          # JWT authentication middleware
├── routes/
│   ├── auth.js               # Authentication routes
│   └── notes.js              # Notes CRUD routes
├── index.js                  # Main server file
├── supabaseClient.js         # Supabase client configuration
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🛡️ Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Tokens**: Secure authentication with configurable expiration
- **Input Validation**: express-validator for request validation
- **CORS**: Cross-origin resource sharing configuration
- **Environment Variables**: Secure configuration management
- **SQL Injection Protection**: Parameterized queries via Supabase

## 🚀 Deployment

### Railway Deployment
The project includes `railway.json` for easy deployment on Railway.

### Environment Variables for Production
Make sure to set all required environment variables in your production environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, email support@notechat.com or create an issue in the repository.

## 🔄 Version History

- **v1.0.0** - Initial release with basic CRUD operations
- **v1.1.0** - Added real-time chat functionality
- **v1.2.0** - Enhanced security and validation 