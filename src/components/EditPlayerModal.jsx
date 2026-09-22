import { useState } from 'react';

export function EditPlayerModal({ player, onSave, onClose }) {
  const [name, setName] = useState(player.name);
  const [minutes, setMinutes] = useState((player.remainingMs / 60000).toFixed(2));

  function handleSave() {
    onSave({ name, remainingMs: Math.round(Number(minutes) * 60000) });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Minutes remaining
          <input type="number" step="0.1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <button onClick={handleSave}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
