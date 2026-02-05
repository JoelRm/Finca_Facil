import { useState, useRef, useEffect } from 'react';

const PERIODS = ['Este año', 'Últimos 12 meses', 'Este mes'];

export default function YearFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm flex items-center space-x-2"
      >
        <span>{value}</span>
        <span>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg text-sm z-20">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                p === value ? 'text-purple-600 font-medium' : 'text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
