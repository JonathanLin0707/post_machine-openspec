interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        className={`px-6 py-3 rounded-lg font-bold text-lg whitespace-nowrap transition-all ${
          selectedCategory === null
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        onClick={() => onSelectCategory(null)}
      >
        全部商品
      </button>
      
      {categories.map((category) => (
        <button
          key={category}
          className={`px-6 py-3 rounded-lg font-bold text-lg whitespace-nowrap transition-all ${
            selectedCategory === category
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => onSelectCategory(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
