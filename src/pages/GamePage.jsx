import { useParams } from 'react-router-dom';

export function GamePage() {
  const { gameId } = useParams();
  return <h1>Game: {gameId}</h1>;
}
