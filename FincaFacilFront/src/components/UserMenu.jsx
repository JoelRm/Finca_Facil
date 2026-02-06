import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const email = user?.email || "usuario@fincafacil.com";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative">
      {/* Botón redondo con la inicial */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 text-xs z-20">
          <div className="px-3 pb-2 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase mb-0.5">
              Sesión iniciada
            </p>
            <p className="font-medium text-gray-800 truncate" title={email}>
              {email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
