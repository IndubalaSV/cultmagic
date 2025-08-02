# Litflix - Book & Movie Discovery App

A modern web application for discovering personalized book and movie recommendations using the Qloo Cultural Taste API.

## Features

- **Personalized Recommendations**: Get book, movie, and TV show recommendations based on your interests
- **Cross-Domain Discovery**: Find books with similar plot arcs and emotional themes
- **Demographic Filtering**: Filter recommendations by age and gender
- **Beautiful UI**: Modern, responsive design with smooth interactions
- **Detail Views**: Click on any recommendation to see detailed information

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Python 3.8+**: Core language
- **Requests**: HTTP library for API calls
- **Pydantic**: Data validation

### Frontend
- **React 19**: Modern React with hooks
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons
- **Axios**: HTTP client

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - **Windows**: `.venv\Scripts\activate`
   - **macOS/Linux**: `source .venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Qloo API key:
   ```
   QLOO_API_KEY=your_api_key_here
   DEBUG=True
   ```

6. Run the backend server:
   ```bash
   python main.py
   ```
   
   The backend will be available at `http://localhost:8000` (or your configured HOST:PORT)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:5173` (or your configured frontend URL)

## API Endpoints

The backend provides the following endpoints:

- `POST /api/recommendations`: Get personalized recommendations
  - **Body**: 
    ```json
    {
      "movie_name": "The Wolf of Wall Street",
      "book_name": "Lolita", 
      "place_name": "Paris",
      "age": "36_to_55",
      "gender": "female"
    }
    ```
  - **Response**: 
    ```json
    {
      "book_recs": [...],
      "movie_recs": [...],
      "tv_show_recs": [...]
    }
    ```

## How It Works

1. **User Input**: User enters their favorite movie, book, and place
2. **Entity Search**: The app searches for entity IDs using Qloo's search API
3. **Recommendations**: Uses the entity IDs to get personalized recommendations
4. **Display**: Shows cross-domain recommendations in beautiful carousels

## Age Range Options

The app supports the following age ranges as required by the Qloo API:
- `24_and_younger`
- `25_to_29`
- `30_to_34`
- `35_and_younger`
- `35_to_44`
- `36_to_55`
- `45_to_54`
- `55_and_older`

## Gender Options

- `male`
- `female`

## Development

### Backend Development
- The main API logic is in `backend/app/routes.py`
- Uses FastAPI for automatic API documentation
- Includes CORS configuration for frontend integration

### Frontend Development
- Main component is `frontend/src/App.jsx`
- Uses Tailwind CSS for styling
- Responsive design with mobile-first approach
- Includes loading states and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created for the Qloo Hackathon.

## Thanks, have fun!