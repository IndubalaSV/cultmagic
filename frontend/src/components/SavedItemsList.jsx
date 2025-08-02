import { useState } from 'react'
import { Trash2, BookOpen, Film, MapPin, X, Heart } from 'lucide-react'
import { useSavedItems } from '../contexts/SavedItemsContext'
import { useAuth } from '../contexts/AuthContext'

const SavedItemsList = ({ isOpen, onClose }) => {
  const { savedItems, removeItem, loading } = useSavedItems()
  const { userPreferences } = useAuth()
  const [removingItem, setRemovingItem] = useState(null)

  const handleRemoveItem = async (itemId) => {

    setRemovingItem(itemId)
    try {
      const result = await removeItem(itemId)

      if (!result.success) {
  
      }
    } catch (error) {
      // Handle remove error silently
    } finally {
      setRemovingItem(null)
    }
  }

  const getItemIcon = (type) => {
    // Handle both "book" and "urn:entity:book" formats
    const cleanType = type?.replace('urn:entity:', '') || type
    
    switch (cleanType) {
      case 'book':
        return <BookOpen className="w-6 h-6 text-gray-400" />
      case 'movie':
        return <Film className="w-6 h-6 text-gray-400" />
      case 'tv_show':
        return <Film className="w-6 h-6 text-gray-400" />
      default:
        return <MapPin className="w-6 h-6 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            My List
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No saved items yet</p>
            <p className="text-gray-400">Start adding books and movies to your list!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Favorites Section */}
            {savedItems && savedItems.filter(item => item.favorited).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Heart className="w-5 h-5 text-red-500 mr-2" />
                  My Favorites
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {savedItems.filter(item => item.favorited).map((item) => (
                    <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-4 relative">
                      <div className="flex items-center space-x-2 mb-2">
                        {getItemIcon(item.item_type)}
                        <span className="text-xs text-red-600 uppercase font-medium">
                          {item.item_type?.replace('urn:entity:', '') || item.item_type}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.item_id)}
                          disabled={removingItem === item.item_id}
                          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove from favorites"
                        >
                          {removingItem === item.item_id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {item.item_image ? (
                        <img
                          src={item.item_image}
                          alt={item.item_name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      
                      {!item.item_image && (
                        <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                          {getItemIcon(item.item_type)}
                        </div>
                      )}

                      <h4 className="font-medium text-gray-900 mb-2">{item.item_name}</h4>
                      <p className="text-xs text-red-500 font-medium">❤️ Favorited</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Items Section - Only show non-favorited items */}
            {savedItems && savedItems.filter(item => !item.favorited).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedItems.filter(item => !item.favorited).map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getItemIcon(item.item_type)}
                                             <span className="text-xs text-gray-500 uppercase font-medium">
                         {item.item_type?.replace('urn:entity:', '') || item.item_type}
                       </span>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.item_id)}
                      disabled={removingItem === item.item_id}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {removingItem === item.item_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {item.item_image ? (
                    <img
                      src={item.item_image}
                      alt={item.item_name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  
                  {!item.item_image && (
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                      {getItemIcon(item.item_type)}
                    </div>
                  )}

                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {item.item_name}
                  </h3>

                  <div className="mt-3 text-xs text-gray-400">
                    Saved on {new Date(item.saved_at).toLocaleDateString()}
                  </div>
                </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SavedItemsList 