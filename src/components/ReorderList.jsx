import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatMinutes, parseMinutes } from '../state/minutes';

function ReorderRow({
  player, dragging, slot, rowRef, onHandlePointerDown, onHandlePointerMove, onHandlePointerUp,
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
    <li ref={rowRef} style={{ order: slot }} className={`reorder-row${dragging ? ' dragging' : ''}`}>
      <button
        type="button"
        className="drag-handle"
        aria-label="Drag to reorder"
        disabled={handleDisabled}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
          {[2, 8, 14].map((cy) => (
            <g key={cy}>
              <circle cx="2" cy={cy} r="1.5" />
              <circle cx="8" cy={cy} r="1.5" />
            </g>
          ))}
        </svg>
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

const SETTLE_MS = 3000;
const DRAG_SCALE = 1.02;

function dragTransform(dy) {
  return `translateY(${dy}px) scale(${DRAG_SCALE})`;
}

export function ReorderList({ players, onMove, onRename, onSetTime, onDone }) {
  const [order, setOrder] = useState(() => players.map((p) => p.id));
  const [draggingId, setDraggingId] = useState(null);
  // DOM order held fixed for the length of a drag (see the render below).
  const [frozenIds, setFrozenIds] = useState(null);

  const rowRefs = useRef({});
  const orderRef = useRef(order);
  const dragRef = useRef(null); // { id, grabY, grabTop, top, dy, startOrder }
  const rowTopsRef = useRef({}); // last laid-out offsetTop per row, for FLIP
  const pendingOrderRef = useRef(null);
  const glideRef = useRef(null); // { id, dy } drop animation, started after the commit
  const [settleTick, setSettleTick] = useState(0);

  function applyOrder(next) {
    orderRef.current = next;
    setOrder(next);
  }

  // Re-sync from live props, but never while a drag gesture is in flight --
  // a Firestore update mid-drag shouldn't yank the item out from under the
  // user's finger. After a drop, keep the local order until the server
  // catches up so the row doesn't flash back to its old slot.
  useEffect(() => {
    if (draggingId !== null) return;
    const ids = players.map((p) => p.id);
    const pending = pendingOrderRef.current;
    if (pending) {
      if (ids.every((id, i) => id === pending[i])) pendingOrderRef.current = null;
      else return;
    }
    applyOrder(ids);
  }, [players, draggingId, settleTick]);

  // Give up waiting for the server if a reorder never shows up in the props.
  useEffect(() => {
    if (draggingId !== null || !pendingOrderRef.current) return undefined;
    const timer = setTimeout(() => {
      pendingOrderRef.current = null;
      setSettleTick((t) => t + 1);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [draggingId]);

  // After every layout: slide rows that moved to their new slot (FLIP) and
  // keep the dragged row pinned under the pointer.
  useLayoutEffect(() => {
    const drag = dragRef.current;
    for (const id of orderRef.current) {
      const el = rowRefs.current[id];
      if (!el) continue;
      const top = el.offsetTop;
      const prev = rowTopsRef.current[id];
      if (drag && id === drag.id) {
        drag.dy = drag.top - top;
        el.style.transform = dragTransform(drag.dy);
      } else if (prev !== undefined && prev !== top) {
        el.animate(
          [{ transform: `translateY(${prev - top}px)` }, { transform: 'translateY(0)' }],
          { duration: 180, easing: 'ease-out' },
        );
      }
      rowTopsRef.current[id] = top;
    }

    // Start the drop glide only now: releasing the row un-freezes the DOM
    // order, and moving the <li> would cancel an animation started earlier.
    const glide = glideRef.current;
    const glideEl = glide && rowRefs.current[glide.id];
    if (glideEl) {
      glideEl.animate(
        [{ transform: dragTransform(glide.dy) }, { transform: 'none' }],
        { duration: 160, easing: 'ease-out' },
      );
    }
    glideRef.current = null;
  });

  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));

  function handlePointerDown(e, id) {
    const el = rowRefs.current[id];
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      grabY: e.clientY,
      grabTop: el.offsetTop,
      top: el.offsetTop,
      dy: 0,
      startOrder: orderRef.current,
    };
    setFrozenIds(orderRef.current);
    setDraggingId(id);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const el = rowRefs.current[drag.id];
    if (!el) return;

    // The row follows the pointer exactly, clamped to the list.
    const rows = Object.values(rowRefs.current).filter(Boolean);
    const minTop = Math.min(...rows.map((r) => r.offsetTop));
    const maxTop = Math.max(...rows.map((r) => r.offsetTop + r.offsetHeight)) - el.offsetHeight;
    drag.top = Math.min(maxTop, Math.max(minTop, drag.grabTop + (e.clientY - drag.grabY)));
    drag.dy = drag.top - el.offsetTop;
    el.style.transform = dragTransform(drag.dy);

    // Drop into the slot the dragged row's centre has reached: it takes a
    // neighbour's place once it is over half of it, not only at the midpoint.
    const center = drag.top + el.offsetHeight / 2;
    const others = orderRef.current.filter((id) => id !== drag.id);
    const targetIndex = others.filter((id) => {
      const other = rowRefs.current[id];
      return other && other.offsetTop + other.offsetHeight / 2 < center;
    }).length;

    if (orderRef.current[targetIndex] !== drag.id) {
      const next = [...others];
      next.splice(targetIndex, 0, drag.id);
      applyOrder(next);
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    // Glide from where the row was released into its slot.
    const el = rowRefs.current[drag.id];
    if (el) el.style.transform = '';
    glideRef.current = { id: drag.id, dy: drag.dy };

    setDraggingId(null);
    setFrozenIds(null);
    const next = orderRef.current;
    if (next.some((id, i) => id !== drag.startOrder[i])) {
      pendingOrderRef.current = next;
      onMove(next);
    }
  }

  const handleDisabled = players.length < 2;

  // Rows are laid out with CSS `order`, and their DOM order stays put while a
  // drag is in flight. Moving the dragged <li> in the DOM would drop its pointer
  // capture and strand the gesture (this is what broke dragging downwards).
  const domIds = frozenIds ?? order;

  return (
    <ul className="reorder-list">
      {domIds.map((id) => {
        const player = playersById[id];
        if (!player) return null;
        return (
          <ReorderRow
            key={id}
            player={player}
            dragging={draggingId === id}
            slot={order.indexOf(id)}
            rowRef={(el) => { rowRefs.current[id] = el; }}
            onHandlePointerDown={(e) => handlePointerDown(e, id)}
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
