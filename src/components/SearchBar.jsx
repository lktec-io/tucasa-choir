import { FiSearch, FiX } from 'react-icons/fi';
import '../styles/SearchBar.css';

export default function SearchBar({ value, onChange, placeholder = 'Search hymns...' }) {
  return (
    <div className="search-bar-wrap">
      <FiSearch className="search-bar-icon" aria-hidden="true" />
      <input
        type="text"
        className="form-input with-icon search-bar-input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="btn btn-tertiary btn-icon btn-sm search-clear-btn" onClick={() => onChange('')} aria-label="Clear search">
          <FiX />
        </button>
      )}
    </div>
  );
}
