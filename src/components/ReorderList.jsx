export function ReorderList({ players, onMove, onDone }) {
  function moveUp(index) {
    if (index === 0) return;
    const newOrder = players.map((p) => p.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onMove(newOrder);
  }

  function moveDown(index) {
    if (index === players.length - 1) return;
    const newOrder = players.map((p) => p.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onMove(newOrder);
  }

  return (
    <ul className="reorder-list">
      {players.map((p, i) => (
        <li key={p.id}>
          <span>{p.name}</span>
          <button onClick={() => moveUp(i)} disabled={i === 0}>Up</button>
          <button onClick={() => moveDown(i)} disabled={i === players.length - 1}>Down</button>
        </li>
      ))}
      <li><button onClick={onDone}>Done</button></li>
    </ul>
  );
}
