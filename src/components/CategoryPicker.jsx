import Modal from './Modal.jsx';
import { CATEGORIES } from '../game/content/index.js';
import Icon from './Icon.jsx';

export default function CategoryPicker({ value, onChange, onClose }) {
  return (
    <Modal title="Choose a category" onClose={onClose} wide>
      <p className="muted">Every category resets daily at midnight ET, and everyone gets the same seven topics.</p>
      <div className="cat-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`cat-card ${value === c.id ? 'is-on' : ''}`}
            onClick={() => {
              onChange(c.id);
              onClose();
            }}
          >
            <span className="cat-emoji" aria-hidden="true">
              <Icon name={c.icon} scale={3} />
            </span>
            <span className="cat-name">{c.name}</span>
            <span className="cat-blurb">{c.blurb}</span>
            {c.id === 'random' && <span className="cat-tag">Default</span>}
          </button>
        ))}
      </div>
      <p className="muted small">More categories are on the way.</p>
    </Modal>
  );
}
