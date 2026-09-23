import { useEffect, useRef, useState } from 'react';
import { formatMinutes, parseMinutes } from '../state/minutes';

function ReorderRow({
  player, index, dragging, rowRef, onHandlePointerDown, onHandlePointerMove, onHandlePointerUp,
  onRename, onSetTime, handleDisabled,
}) {
  const [draft, setDraft] = useState(player.name);
  const [focused, setFocused] = useState(false);
  const shownTime = formatMinutes(player.remainingMs);
  const [timeDraft, setTimeDraft] = useState(shownTime);
  const [timeFocused, setTimeFocused] = useState(false);

  // Keep the local draft in sync with the live prop value, but only while
  // the field isn't focused -- otherwise an in-flight edit from another
  // device would clobber what the user is currently typing.
  useEffect(() => {
    if (!focused) setDraft(player.name);
  }, [player.name, focused]);

  // Same guard as the name field, for the live remaining-time value.
  useEffect(() => {
    if (!timeFocused) setTimeDraft(shownTime);
  }, [shownTime, timeFocused]);

  function commit() {
    if (draft !== player.name) onRename(player.id, draft);
  }

  function commitTime() {
    const ms = parseMinutes(timeDraft);
    // Unparseable or untouched: snap back to the live value rather than
    // sending a bad update (or rounding the exact remaining time).
    if (ms === null || timeDraft.trim() === shownTime) {
      setTimeDraft(shownTime);
      return;
    }
    onSetTime(player.id, ms);
  }

  return (
    <li ref={rowRef} className={`reorder-row${dragging ? ' dragging' : ''}`}>
      <button
        type="button"
        className="drag-handle"
        aria-label="Drag to reorder"
        disabled={handleDisabled}
        onPointerDown={(e) => onHandlePointerDown(e, index)}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
      >
        ⠿
      </button>
      <input
        type="text"
        className="reorder-name-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            e.target.blur();
          }
        }}
      />
      <input
        type="text"
        inputMode="decimal"
        className="minutes-input"
        aria-label={`Minutes for ${player.name}`}
        value={timeDraft}
        onChange={(e) => setTimeDraft(e.target.value)}
        onFocus={() => setTimeFocused(true)}
        onBlur={() => {
          setTimeFocused(false);
          commitTime();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
        }}
      />
    </li>
  );
}

export function ReorderList({ players, onMove, onRename, onSetTime, onDone }) {
  const [order, setOrder] = useState(() => players.map((p) => p.id));
  const [draggingIndex, setDraggingIndex] = useState(null);

  const rowRefs = useRef({});
  const dragStartOrderRef = useRef(order);

  // Re-sync from live props, but never while a drag gesture is in flight --
  // a Firestore update mid-drag shouldn't yank the item out from under the
  // user's finger.
  useEffect(() => {
    if (draggingIndex === null) {
      setOrder(players.map((p) => p.id));
    }
  }, [players, draggingIndex]);

  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));

  function handlePointerDown(e, index) {
    e.target.setPointerCapture(e.pointerId);
    dragStartOrderRef.current = order;
    setDraggingIndex(index);
  }

  function handlePointerMove(e) {
    if (draggingIndex === null) return;
    const draggedId = order[draggingIndex];
    if (!draggedId) return;

    // Find the row whose vertical midpoint the pointer has crossed.
    let targetIndex = order.length - 1;
    for (let i = 0; i < order.length; i++) {
      const el = rowRefs.current[order[i]];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex !== draggingIndex) {
      const newOrder = [...order];
      [newOrder[draggingIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[draggingIndex]];
      setOrder(newOrder);
      setDraggingIndex(targetIndex);
    }
  }

  function handlePointerUp() {
    if (draggingIndex === null) return;
    setDraggingIndex(null);
    const changed = order.some((id, i) => id !== dragStartOrderRef.current[i]);
    if (changed) onMove(order);
  }

  const handleDisabled = players.length < 2;

  return (
    <ul className="reorder-list">
      {order.map((id, index) => {
        const player = playersById[id];
        if (!player) return null;
        return (
          <ReorderRow
            key={id}
            player={player}
            index={index}
            dragging={draggingIndex === index}
            rowRef={(el) => { rowRefs.current[id] = el; }}
            onHandlePointerDown={handlePointerDown}
            onHandlePointerMove={handlePointerMove}
            onHandlePointerUp={handlePointerUp}
            onRename={onRename}
            onSetTime={onSetTime}
            handleDisabled={handleDisabled}
          />
        );
      })}
      <li className="reorder-done"><button onClick={onDone}>Done</button></li>
    </ul>
  );
}
