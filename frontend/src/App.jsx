import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Film,
  MapPin,
  User,
  Star,
  LogIn,
  LogOut,
  Heart,
  Settings,
  X,
} from "lucide-react";
import axios from "axios";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  SavedItemsProvider,
  useSavedItems,
} from "./contexts/SavedItemsContext";
import LoginModal from "./components/LoginModal";
import SavedItemsList from "./components/SavedItemsList";
import PreferencesModal from "./components/PreferencesModal";
import SearchBox from "./components/SearchBox";
import toast, { Toaster } from "react-hot-toast";

function AppContent() {
  const {
    user,
    isAuthenticated,
    logout,
    savePreferences,
    getPreferences,
    userPreferences: authUserPreferences,
    loading: authLoading,
  } = useAuth();
  const { saveItem, isItemSaved, savedItems } = useSavedItems();

  const [formData, setFormData] = useState({
    movie: "",
    book: "",
    age: "",
    gender: "",
  });

  const [recommendations, setRecommendations] = useState({
    book_recs: [],
    popular_books: [],
    movie_recs: [],
    tv_show_recs: [],
  });

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  // Remove duplicate userPreferences state - use AuthContext instead
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [popupItem, setPopupItem] = useState(null);

  const ageOptions = [
    "24_and_younger",
    "25_to_29",
    "30_to_34",
    "35_and_younger",
    "35_to_44",
    "36_to_55",
    "45_to_54",
    "55_and_older",
  ];

  const loadUserPreferences = useCallback(async () => {
    const result = await getPreferences();
    if (result.success && result.data) {
      // Auto-populate the form with saved preferences
      setFormData((prev) => ({
        ...prev,
        movie: result.data.movie_name || "",
        book: result.data.book_name || "",
        age: result.data.age || "",
        gender: result.data.gender || "",
      }));
    }
  }, [getPreferences]);

  // Preferences modal close handler
  const handlePreferencesModalClose = () => {
    setShowPreferencesModal(false);
  };

  // Handle preferences update from modal
  const handlePreferencesUpdate = async () => {
    await loadUserPreferences();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save preferences if user is authenticated
      if (isAuthenticated) {
        await savePreferences({
          movie_name: formData.movie || undefined,
          book_name: formData.book || undefined,
          age: formData.age || undefined,
          gender: formData.gender || undefined,
        });
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/recommendations`,
        {
          movie_name: formData.movie || undefined,
          book_name: formData.book || undefined,
          age: formData.age || undefined,
          gender: formData.gender || undefined,
        }
      );

      setRecommendations(response.data);
    } catch (error) {
      // Handle error silently - user will see empty results
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    setPopupItem(item);
    setShowDetailPopup(true);
  };

  const handleSaveItem = async (item, type) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const saveData = {
      item_id: item.entity_id || item.id,
      item_name: item.name || item.title,
      item_type: type?.replace(/^urn:[a-z]*:?/i, '').trim() || 'movie',
      item_image:
        item.image_url ||
        item.cover_image ||
        item.image ||
        item.properties?.image?.url ||
        "",
      item_description: item.properties?.short_description || "",
      favorited: false,
    };

    const result = await saveItem(saveData);

    if (result.success) {
      toast.success("Item added to your list!");
    } else {

      if (result.error !== "Item already saved") {
        toast.error(`Failed to save item: ${result.error}`);
      }
    }
  };

  const handleLikeItem = async (item, type) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
  

      // Save to favorites (separate from preferences)
      const favoriteData = {
        item_id: item.entity_id || item.id || "",
        item_name: item.name || item.title || "Unknown",
        item_type: type?.replace(/^urn:[a-z]*:?/i, '').trim() || 'movie',
        item_image:
          item.image_url ||
          item.cover_image ||
          item.image ||
          item.properties?.image?.url ||
          "",
        item_description: item.properties?.short_description || "",
        favorited: true,
      };

      const saveResult = await saveItem(favoriteData);

      if (saveResult.success) {
        toast.success(`Added ${item.name || item.title} to favorites!`);
        
        // Don't refresh recommendations immediately to avoid page reset
        // Recommendations will update naturally when user searches again
      } else {

        toast.error("Failed to add to favorites");
      }
    } catch (error) {

      toast.error("Failed to add to favorites");
    }
  };

  const fetchRecommendations = useCallback(async () => {

    setLoading(true);
    try {
      // Get favorited items' IDs to include as signal.interests.entities
      const favoritedItemIds = savedItems
        .filter((item) => item.favorited === true)
        .map((item) => item.item_id)
        .filter((id) => id); // Remove any undefined/null IDs




      // The backend handles favorited items automatically through the database
      // We just need to trigger the recommendations endpoint
      const requestPayload = {};


  

      // The backend will automatically query the database for favorited items
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/recommendations`,
        requestPayload
      );

      setRecommendations(response.data);
    } catch (err) {
      // Handle error silently
      setRecommendations({
        book_recs: [],
        popular_books: [],
        movie_recs: [],
        tv_show_recs: [],
      });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Backend handles favorited items automatically

  // Load user preferences and fetch recommendations when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Load user preferences first
      loadUserPreferences();
      // Fetch recommendations
      fetchRecommendations();
    }
  }, [isAuthenticated, authLoading]); // Removed function dependencies to prevent infinite loop

  const handleSearchResults = (results) => {
    setSearchResults(results);
  };

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="text-sm text-gray-600 ml-1">{rating}</span>
      </div>
    );
  };

  // Helper function to safely render any value as string
  const safeRender = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "object") {
      // Special handling for Goodreads ID
      if (Array.isArray(value) && value.length > 0 && value[0].id) {
        return value[0].id;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderCarousel = (items, title, type) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="book-card p-4 relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div
                className="w-full h-96 bg-gray-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                {item.image_url ||
                item.cover_image ||
                (item.properties &&
                  item.properties.image &&
                  item.properties.image.url) ? (
                  <img
                    src={
                      item.image_url ||
                      item.cover_image ||
                      (item.properties &&
                        item.properties.image &&
                        item.properties.image.url)
                    }
                    alt={item.name || item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}

                {!item.image_url &&
                  !item.cover_image &&
                  !(
                    item.properties &&
                    item.properties.image &&
                    item.properties.image.url
                  ) && (
                    <div className="flex items-center justify-center">
                      {type === "book" ? (
                        <BookOpen className="w-16 h-16 text-gray-400" />
                      ) : type === "movie" ? (
                        <Film className="w-16 h-16 text-gray-400" />
                      ) : (
                        <MapPin className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                  )}
              </div>

              <div
                onClick={() => handleItemClick(item)}
                className="cursor-pointer"
              >
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-lg">
                  {item.name || item.title || "Unknown Title"}
                </h3>

                {item.author && (
                  <p className="text-sm text-gray-600 mb-2">by {item.author}</p>
                )}

                {item.properties && item.properties.short_description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {item.properties.short_description}
                  </p>
                )}

                {item.rating && (
                  <div className="mb-3">
                    {renderStarRating(item.rating)}
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        if (
                          typeof item.rating_count === "object" &&
                          item.rating_count !== null
                        ) {
                          return (
                            item.rating_count.user_ratings_count ||
                            item.rating_count.count ||
                            "0"
                          );
                        }
                        return item.rating_count || "0";
                      })()}{" "}
                      ratings
                    </p>
                  </div>
                )}

                {item.properties && item.properties.publication_year && (
                  <p className="text-xs text-gray-500 mb-2">
                    Published: {safeRender(item.properties.publication_year)}
                  </p>
                )}

                {item.properties && item.properties.genre && (
                  <p className="text-xs text-gray-500 mb-2">
                    Genre: {safeRender(item.properties.genre)}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase font-medium">
                    {type === "book"
                      ? "📚 Book"
                      : type === "movie"
                      ? "🎬 Movie"
                      : type === "tv_show"
                      ? "📺 TV Show"
                      : "📍 Place"}
                  </span>

                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeItem(item, type);
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        isItemSaved(item.entity_id || item.id)
                          ? "bg-red-500 text-white"
                          : "bg-white text-red-500 hover:bg-red-50 border border-gray-200"
                      }`}
                      title={
                        isItemSaved(item.entity_id || item.id)
                          ? "In favorites"
                          : "Add to favorites"
                      }
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isItemSaved(item.entity_id || item.id)
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveItem(item, type);
                      }}
                      className={`p-2 rounded-full transition-colors ${
                        isItemSaved(item.entity_id || item.id)
                          ? "bg-green-500 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                      title={
                        isItemSaved(item.entity_id || item.id)
                          ? "Already saved"
                          : "Add to list"
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Additional Details */}
                {item.properties && item.properties.page_count && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pages: {safeRender(item.properties.page_count)}
                  </p>
                )}

                {item.properties && item.properties.language && (
                  <p className="text-xs text-gray-500">
                    Language: {safeRender(item.properties.language)}
                  </p>
                )}

                {item.properties && item.properties.publisher && (
                  <p className="text-xs text-gray-500">
                    Publisher: {safeRender(item.properties.publisher)}
                  </p>
                )}

                {item.properties && item.properties.isbn13 && (
                  <p className="text-xs text-gray-500">
                    ISBN: {safeRender(item.properties.isbn13)}
                  </p>
                )}

                {item.properties && item.properties.format && (
                  <p className="text-xs text-gray-500">
                    Format: {safeRender(item.properties.format)}
                  </p>
                )}

                {item.external && item.external.goodreads && (
                  <p className="text-xs text-gray-500">
                    Goodreads ID: {safeRender(item.external.goodreads)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1
              className="text-2xl font-bold text-primary-600 cursor-pointer hover:text-primary-700 transition-colors"
              onClick={() => {
                setSearchResults([]);
                setShowDetailPopup(false);
                setPopupItem(null);
              }}
              title="Go to Home"
            >
              Litflix
            </h1>

            {/* Search Box */}
            <div className="flex-1 max-w-md mx-8">
              <SearchBox onSearchResults={handleSearchResults} />
            </div>

            <nav className="flex items-center space-x-6">
              <button
                onClick={() => setShowSavedItems(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                My List
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => setShowPreferencesModal(true)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                  title="Update Preferences"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Preferences
                </button>
              )}

              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Welcome, {user?.username}!
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Login
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Search Results
              </h2>
              <button
                onClick={() => {
                  setSearchResults([]);
                  // Clear search results
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear Results
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
              {searchResults.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setPopupItem(item);
                    setShowDetailPopup(true);
                  }}
                >
                  <div className="relative h-80">
                    {/* Try to get image from multiple possible sources */}
                    {(() => {
                      const imageUrl =
                        item.image_url ||
                        item.cover_image ||
                        item.image ||
                        item.properties?.image?.url ||
                        (item.properties &&
                          item.properties.image &&
                          item.properties.image.url);

                      if (imageUrl) {
                        return (
                          <img
                            src={imageUrl}
                            alt={item.name || item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Fallback placeholder */}
                    {(() => {
                      const imageUrl =
                        item.image_url ||
                        item.cover_image ||
                        item.image ||
                        item.properties?.image?.url ||
                        (item.properties &&
                          item.properties.image &&
                          item.properties.image.url);

                      if (!imageUrl) {
                        return (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <div className="text-6xl">
                              {item.type?.replace("urn:entity:", "") === "book"
                                ? "📚"
                                : item.type?.replace("urn:entity:", "") ===
                                  "movie"
                                ? "🎬"
                                : item.type?.replace("urn:entity:", "") ===
                                  "tv_show"
                                ? "📺"
                                : "📍"}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeItem(
                            item,
                            item.type?.replace("urn:entity:", "") || "movie"
                          );
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          isItemSaved(item.entity_id || item.id)
                            ? "bg-red-500 text-white"
                            : "bg-white text-red-500 hover:bg-red-50"
                        }`}
                        title={
                          isItemSaved(item.entity_id || item.id)
                            ? "In favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isItemSaved(item.entity_id || item.id)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveItem(
                            item,
                            item.type?.replace("urn:entity:", "") || "movie"
                          );
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          isItemSaved(item.entity_id || item.id)
                            ? "bg-green-500 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                        title={
                          isItemSaved(item.entity_id || item.id)
                            ? "Already saved"
                            : "Add to list"
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 uppercase font-medium">
                        {item.type?.replace("urn:entity:", "") === "book"
                          ? "📚 Book"
                          : item.type?.replace("urn:entity:", "") === "movie"
                          ? "🎬 Movie"
                          : item.type?.replace("urn:entity:", "") === "tv_show"
                          ? "📺 TV Show"
                          : "📍 Place"}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-lg">
                      {item.name || item.title}
                    </h3>

                    {item.author && (
                      <p className="text-sm text-gray-600 mb-2">
                        by {item.author}
                      </p>
                    )}

                    {item.properties && item.properties.short_description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                        {item.properties.short_description}
                      </p>
                    )}

                    {(!item.properties ||
                      !item.properties.short_description) && (
                      <p className="text-sm text-gray-500 line-clamp-3 mb-2 italic">
                        No description available
                      </p>
                    )}

                    {item.rating && (
                      <div className="mb-2">
                        {renderStarRating(item.rating)}
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            if (
                              typeof item.rating_count === "object" &&
                              item.rating_count !== null
                            ) {
                              return (
                                item.rating_count.user_ratings_count ||
                                item.rating_count.count ||
                                "0"
                              );
                            }
                            return item.rating_count || "0";
                          })()}{" "}
                          ratings
                        </p>
                      </div>
                    )}

                    {item.properties && item.properties.publication_year && (
                      <p className="text-xs text-gray-500 mb-1">
                        Published: {item.properties.publication_year}
                      </p>
                    )}

                    {item.properties && item.properties.genre && (
                      <p className="text-xs text-gray-500 mb-1">
                        Genre: {item.properties.genre}
                      </p>
                    )}

                    {item.properties && item.properties.page_count && (
                      <p className="text-xs text-gray-500 mb-1">
                        Pages: {item.properties.page_count}
                      </p>
                    )}

                    {item.properties && item.properties.language && (
                      <p className="text-xs text-gray-500 mb-1">
                        Language: {item.properties.language}
                      </p>
                    )}

                    {item.properties && item.properties.publisher && (
                      <p className="text-xs text-gray-500 mb-1">
                        Publisher: {item.properties.publisher}
                      </p>
                    )}

                    {item.properties && item.properties.isbn13 && (
                      <p className="text-xs text-gray-500 mb-1">
                        ISBN: {item.properties.isbn13}
                      </p>
                    )}

                    {item.properties && item.properties.format && (
                      <p className="text-xs text-gray-500 mb-1">
                        Format: {item.properties.format}
                      </p>
                    )}

                    {item.external && item.external.goodreads && (
                      <p className="text-xs text-gray-500 mb-1">
                        Goodreads ID:{" "}
                        {typeof item.external.goodreads === "object"
                          ? JSON.stringify(item.external.goodreads)
                          : item.external.goodreads}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Input Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Movie you love?
              </label>
              <input
                type="text"
                value={formData.movie}
                onChange={(e) => handleInputChange("movie", e.target.value)}
                className="input-field"
                placeholder="Enter a movie name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Books you love?
              </label>
              <input
                type="text"
                value={formData.book}
                onChange={(e) => handleInputChange("book", e.target.value)}
                className="input-field"
                placeholder="Enter a book name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <select
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                className="input-field"
              >
                <option value="">Select age range</option>
                {ageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.gender === "female"}
                    onChange={(e) =>
                      handleInputChange(
                        "gender",
                        e.target.checked ? "female" : ""
                      )
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Female</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.gender === "male"}
                    onChange={(e) =>
                      handleInputChange(
                        "gender",
                        e.target.checked ? "male" : ""
                      )
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Male</span>
                </label>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    ENTER
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Recommendations */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Finding your perfect recommendations...
            </p>
          </div>
        )}

        {/* Call to Action - Show when no recommendations */}
        {!loading &&
          !searchResults.length &&
          !(
            recommendations.book_recs.length > 0 ||
            recommendations.popular_books.length > 0 ||
            recommendations.movie_recs.length > 0 ||
            recommendations.tv_show_recs.length > 0
          ) && (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <div className="flex justify-center space-x-4 mb-4">
                    <BookOpen className="w-12 h-12 text-primary-600" />
                    <Film className="w-12 h-12 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Discover Your Perfect Match
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Tell us about your favorite movies, books, or places to get
                    personalized recommendations tailored just for you!
                  </p>
                </div>

                <div className="space-y-4">
                  {!isAuthenticated ? (
                    <>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="btn-primary w-full flex items-center justify-center"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In to Get Started
                      </button>
                      <p className="text-sm text-gray-500">
                        Or fill out the form above to get instant
                        recommendations
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPreferencesModal(true)}
                        className="btn-primary w-full flex items-center justify-center"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Set Your Preferences
                      </button>
                      <p className="text-sm text-gray-500">
                        Or use the form above to explore new recommendations
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Initial recommendations */}
        {!loading &&
          (recommendations.book_recs.length > 0 ||
            recommendations.popular_books.length > 0 ||
            recommendations.movie_recs.length > 0 ||
            recommendations.tv_show_recs.length > 0) && (
            <div className="space-y-8">
              {renderCarousel(
                recommendations.book_recs,
                "Books with similar plot arcs",
                "book"
              )}
              {renderCarousel(
                recommendations.popular_books,
                "Best Sellers🔥",
                "book"
              )}
              {renderCarousel(
                recommendations.movie_recs,
                "Movies you might like",
                "movie"
              )}
              {renderCarousel(
                recommendations.tv_show_recs,
                "TV Shows you might like",
                "tv_show"
              )}
            </div>
          )}

        {/* Popular Authors & Series */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Popular authors & series
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Freida McFadden",
              "Stephen King",
              "Mark Bittman",
              "Meghan Quinn",
              "Holman Handbook Series",
              "Mel Robbins",
              "CSB She Reads Truth Bibles",
              "Ava Reid",
              "Tony Evans Study Bibles",
              "Kristi McLelland",
              "Carl Hiaasen",
              "James Bond",
            ].map((author, index) => (
              <button
                key={index}
                className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {author}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onShowPreferences={() => setShowPreferencesModal(true)}
      />

      <SavedItemsList
        isOpen={showSavedItems}
        onClose={() => setShowSavedItems(false)}
      />

      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={handlePreferencesModalClose}
        initialPreferences={authUserPreferences}
        onPreferencesUpdate={handlePreferencesUpdate}
      />

      {/* Detail Popup Card */}
      {showDetailPopup && popupItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {popupItem.name || popupItem.title}
                </h2>
                {popupItem.author && (
                  <p className="text-lg text-gray-600">by {popupItem.author}</p>
                )}
              </div>
              <button
                onClick={() => setShowDetailPopup(false)}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image */}
                <div className="md:col-span-1">
                  <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-lg">
                    {popupItem.image_url ||
                    popupItem.cover_image ||
                    (popupItem.properties &&
                      popupItem.properties.image &&
                      popupItem.properties.image.url) ? (
                      <img
                        src={
                          popupItem.image_url ||
                          popupItem.cover_image ||
                          (popupItem.properties &&
                            popupItem.properties.image &&
                            popupItem.properties.image.url)
                        }
                        alt={popupItem.name || popupItem.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}

                    {!popupItem.image_url &&
                      !popupItem.cover_image &&
                      !(
                        popupItem.properties &&
                        popupItem.properties.image &&
                        popupItem.properties.image.url
                      ) && (
                        <div className="flex items-center justify-center">
                          <BookOpen className="w-24 h-24 text-gray-400" />
                        </div>
                      )}
                  </div>

                  {/* Rating */}
                  {popupItem.rating && (
                    <div className="mt-4">
                      {renderStarRating(popupItem.rating)}
                      <p className="text-sm text-gray-500 mt-1">
                        {(() => {
                          if (
                            typeof popupItem.rating_count === "object" &&
                            popupItem.rating_count !== null
                          ) {
                            return (
                              popupItem.rating_count.user_ratings_count ||
                              popupItem.rating_count.count ||
                              "0"
                            );
                          }
                          return popupItem.rating_count || "0";
                        })()}{" "}
                        ratings
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() =>
                        handleLikeItem(
                          popupItem,
                          popupItem.type?.replace("urn:entity:", "") || "book"
                        )
                      }
                      className={`flex-1 p-3 rounded-lg transition-colors ${
                        isItemSaved(popupItem.entity_id || popupItem.id)
                          ? "bg-red-500 text-white"
                          : "bg-white text-red-500 hover:bg-red-50 border border-gray-200"
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 mx-auto ${
                          isItemSaved(popupItem.entity_id || popupItem.id)
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={() =>
                        handleSaveItem(
                          popupItem,
                          popupItem.type?.replace("urn:entity:", "") || "book"
                        )
                      }
                      className={`flex-1 p-3 rounded-lg transition-colors ${
                        isItemSaved(popupItem.entity_id || popupItem.id)
                          ? "bg-green-500 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-2">
                  {/* Short Description */}
                  {popupItem.properties &&
                    popupItem.properties.short_description && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">
                          Short Description
                        </h3>
                        <p className="text-gray-700">
                          {popupItem.properties.short_description}
                        </p>
                      </div>
                    )}

                  {/* Long Description */}
                  {popupItem.properties && popupItem.properties.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Full Description
                      </h3>
                      <div
                        className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html:
                            popupItem.properties.description
                              ?.replace(/<br\s*\/?>/gi, "<br>")
                              ?.replace(/<p>/gi, '<p class="mb-3">')
                              ?.replace(
                                /<strong>/gi,
                                '<strong class="font-semibold">'
                              )
                              ?.replace(/<em>/gi, '<em class="italic">')
                              ?.replace(
                                /<ul>/gi,
                                '<ul class="list-disc list-inside mb-3">'
                              )
                              ?.replace(
                                /<ol>/gi,
                                '<ol class="list-decimal list-inside mb-3">'
                              )
                              ?.replace(/<li>/gi, '<li class="mb-1">')
                              ?.replace(
                                /<h[1-6]>/gi,
                                '<h3 class="text-lg font-semibold mb-2 mt-4">'
                              )
                              ?.replace(/<\/h[1-6]>/gi, "</h3>") ||
                            popupItem.properties.description,
                        }}
                      />
                    </div>
                  )}

                  {(!popupItem.properties ||
                    (!popupItem.properties.short_description &&
                      !popupItem.properties.description)) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Description
                      </h3>
                      <p className="text-gray-500 italic">
                        No description available
                      </p>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Book-specific fields */}
                    {popupItem.properties?.publication_year && (
                      <div>
                        <span className="font-medium">Publication year:</span>{" "}
                        {safeRender(popupItem.properties.publication_year)}
                      </div>
                    )}
                    {popupItem.properties?.genre && (
                      <div>
                        <span className="font-medium">Genre:</span>{" "}
                        {safeRender(popupItem.properties.genre)}
                      </div>
                    )}
                    {popupItem.properties?.page_count && (
                      <div>
                        <span className="font-medium">Pages:</span>{" "}
                        {safeRender(popupItem.properties.page_count)}
                      </div>
                    )}
                    {popupItem.properties?.language && (
                      <div>
                        <span className="font-medium">Language:</span>{" "}
                        {safeRender(popupItem.properties.language)}
                      </div>
                    )}
                    {popupItem.properties?.publisher && (
                      <div>
                        <span className="font-medium">Publisher:</span>{" "}
                        {safeRender(popupItem.properties.publisher)}
                      </div>
                    )}
                    {popupItem.properties?.isbn13 && (
                      <div>
                        <span className="font-medium">ISBN:</span>{" "}
                        {safeRender(popupItem.properties.isbn13)}
                      </div>
                    )}
                    {popupItem.properties?.format && (
                      <div>
                        <span className="font-medium">Format:</span>{" "}
                        {safeRender(popupItem.properties.format)}
                      </div>
                    )}

                    {/* Movie/TV Show specific fields */}
                    {popupItem.properties?.release_year && (
                      <div>
                        <span className="font-medium">Release year:</span>{" "}
                        {safeRender(popupItem.properties.release_year)}
                      </div>
                    )}
                    {popupItem.properties?.runtime && (
                      <div>
                        <span className="font-medium">Runtime:</span>{" "}
                        {safeRender(popupItem.properties.runtime)}
                      </div>
                    )}
                    {popupItem.properties?.director && (
                      <div>
                        <span className="font-medium">Director:</span>{" "}
                        {safeRender(popupItem.properties.director)}
                      </div>
                    )}
                    {popupItem.properties?.cast && (
                      <div>
                        <span className="font-medium">Cast:</span>{" "}
                        {safeRender(popupItem.properties.cast)}
                      </div>
                    )}
                    {popupItem.properties?.studio && (
                      <div>
                        <span className="font-medium">Studio:</span>{" "}
                        {safeRender(popupItem.properties.studio)}
                      </div>
                    )}
                    {popupItem.properties?.rating && (
                      <div>
                        <span className="font-medium">Rating:</span>{" "}
                        {safeRender(popupItem.properties.rating)}
                      </div>
                    )}
                    {popupItem.properties?.seasons && (
                      <div>
                        <span className="font-medium">Seasons:</span>{" "}
                        {safeRender(popupItem.properties.seasons)}
                      </div>
                    )}
                    {popupItem.properties?.episodes && (
                      <div>
                        <span className="font-medium">Episodes:</span>{" "}
                        {safeRender(popupItem.properties.episodes)}
                      </div>
                    )}
                    {popupItem.properties?.network && (
                      <div>
                        <span className="font-medium">Network:</span>{" "}
                        {safeRender(popupItem.properties.network)}
                      </div>
                    )}

                    {/* External IDs */}
                    {popupItem.external?.goodreads && (
                      <div>
                        <span className="font-medium">Goodreads ID:</span>{" "}
                        {safeRender(popupItem.external.goodreads)}
                      </div>
                    )}
                    {popupItem.external?.imdb && (
                      <div>
                        <span className="font-medium">IMDB ID:</span>{" "}
                        {safeRender(popupItem.external.imdb)}
                      </div>
                    )}
                    {popupItem.external?.tmdb && (
                      <div>
                        <span className="font-medium">TMDB ID:</span>{" "}
                        {safeRender(popupItem.external.tmdb)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 3000,
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SavedItemsProvider>
        <AppContent />
      </SavedItemsProvider>
    </AuthProvider>
  );
}

export default App;
