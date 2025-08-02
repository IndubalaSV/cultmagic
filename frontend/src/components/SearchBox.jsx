import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SearchBox = ({ onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState('movie');
  const [loading, setLoading] = useState(false);
  const [isNaturalLanguage, setIsNaturalLanguage] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);

    try {
      let searchQuery = query;
      let searchEntityType = entityType;

      // If natural language mode is enabled, use Gemini to convert the query
      if (isNaturalLanguage) {
        try {
          const geminiResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/gemini/convert`, {
            query: query,
            entity_type: entityType
          });

          if (geminiResponse.data.success) {
            searchQuery = geminiResponse.data.entity_name;
            searchEntityType = geminiResponse.data.entity_type;
            toast.success(`Found: ${searchQuery} (${searchEntityType})`);
          } else {
            toast.error('Could not understand your query. Try being more specific.');
            setLoading(false);
            return;
          }
        } catch (error) {
          // Handle Gemini API error silently
          // Fallback to exact search if Gemini fails
          toast.warning('AI search temporarily unavailable. Using exact search instead.');
          searchQuery = query; // Use original query
          searchEntityType = entityType; // Use original entity type
        }
      }

      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/search`, {
        query: searchQuery,
        entity_type: searchEntityType
      });

      if (response.data.results && response.data.results.length > 0) {
        onSearchResults(response.data.results, searchEntityType);
        toast.success(`Found ${response.data.results.length} results`);
      } else {
        onSearchResults([], searchEntityType);
        toast.error(`No results found for "${searchQuery}"`);
      }
    } catch (error) {
      // Handle search error silently
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isNaturalLanguage 
                ? "e.g., 'I loved a movie about finance and ambition in New York'"
                : "Search for movies, books, TV shows..."
            }
            className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="movie">🎬 Movie</option>
          <option value="book">📚 Book</option>
          <option value="tv_show">📺 TV Show</option>
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNaturalLanguage(!isNaturalLanguage)}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              isNaturalLanguage
                ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
            title={isNaturalLanguage ? 'Switch to exact search' : 'Switch to natural language search'}
            disabled={loading}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          
          {isNaturalLanguage && (
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200 whitespace-nowrap z-10">
              <Sparkles className="w-3 h-3 inline mr-1" />
              <span>AI</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBox; 