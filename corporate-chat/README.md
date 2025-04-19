# Corporate Chat Module

A communication platform for registered users of the Alcuin School Maintenance Portal. This module enables direct messaging between users and group chat functionality.

## Features

- **Direct Messaging**: One-on-one communication between registered users
- **Group Chats**: Create and manage group conversations with multiple users
- **User Search**: Find other users to start conversations
- **Real-time Updates**: View unread message counts and latest messages
- **User Info**: View information about other users

## Directory Structure

```
corporate-chat/
├── index.html        # Main chat interface
├── README.md         # This file
├── api/              # Server-side API files
│   ├── chat-api.php  # API endpoints for chat functionality
│   └── chat-database.sql # Database schema for chat module
├── css/              # CSS stylesheets
│   └── style.css     # Main stylesheet for the chat module
└── js/               # JavaScript files
    └── chat.js       # Chat functionality and UI interactions
```

## Installation

1. Ensure the main Maintenance Portal is installed with XAMPP
2. Import the database schema from `api/chat-database.sql` into your MySQL database
3. Configure database connection in the main application's `database.php` file

## Usage

1. Navigate to the main portal page
2. Click on the "Chat Portal" button to access the chat interface
3. Only registered and authenticated users can access the chat

## Database Structure

- `chat_direct`: Direct chats between two users
- `chat_groups`: Group chat information
- `chat_group_members`: Members of each group chat
- `chat_messages`: All messages (both direct and group)
- `chat_message_read`: Tracking which users have read which messages

## Future Development

- Implement real-time chat using WebSockets
- Add file attachment capabilities
- Add read receipts
- Implement message deletion
- Add typing indicators
- Create mobile-responsive design improvements
