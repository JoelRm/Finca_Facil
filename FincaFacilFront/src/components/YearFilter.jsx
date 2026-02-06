// src/components/YearFilter.jsx
export default function YearFilter({ value, options = [], onChange }) {
  const handleChange = (e) => {
    const newYear = Number(e.target.value);
    if (!Number.isNaN(newYear)) {
      onChange(newYear);
    }
  };

  const years = options.length ? options : [2025, 2024, 2023];

  return (
    <div className="relative">
      <select
        value={value ?? years[0]}
        onChange={handleChange}
        className="h-9 pl-3 pr-8 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* flechita */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg
          className="h-3 w-3 text-gray-400"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
