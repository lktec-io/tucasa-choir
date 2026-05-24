import { FiSearch, FiX } from 'react-icons/fi';
import '../styles/SearchBar.css';

export default function SearchBar({ value, onChange, placeholder = 'Search hymns...' }) {
  return (
    <div className="search-bar-wrap">
      <FiSearch className="search-bar-icon" />
      <input
        type="text"
        className="search-bar-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear-btn" onClick={() => onChange('')} aria-label="Clear search">
          <FiX />
        </button>
      )}
    </div>
  );
}
