import { Client } from '@neondatabase/serverless';
import { SavedGame } from '../types';

// Connection string from documentation
const DATABASE_URL = "postgresql://neondb_owner:npg_u0nClvQhDpx4@ep-broad-leaf-a771cgcw-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const getClient = () => {
  return new Client(DATABASE_URL);
};

export const fetchLeaderboard = async (): Promise<SavedGame[]> => {
  const client = getClient();
  await client.connect();
  try {
    // Fetch top 50 games sorted by likes then date
    const { rows } = await client.query(`
      SELECT id, title, description, code, likes, "createdAt" 
      FROM "SavedGame" 
      ORDER BY likes DESC, "createdAt" DESC 
      LIMIT 50
    `);
    return rows as SavedGame[];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    throw error;
  } finally {
    // Ensure connection is closed
    try {
        await client.end(); 
    } catch (e) {
        // Ignore close errors
    }
  }
};

export const saveGame = async (gameData: { title: string; description: string; code: string; author: string }): Promise<boolean> => {
  const client = getClient();
  await client.connect();
  
  try {
    const id = crypto.randomUUID();
    // Format title as "[Author] Title" if author is provided
    const finalTitle = gameData.author ? `[${gameData.author}] ${gameData.title}` : gameData.title;

    await client.query(`
      INSERT INTO "SavedGame" (id, title, description, code, likes, "createdAt")
      VALUES ($1, $2, $3, $4, 0, NOW())
    `, [id, finalTitle, gameData.description, gameData.code]);
    
    return true;
  } catch (error) {
    console.error("Failed to save game:", error);
    throw error;
  } finally {
    try {
        await client.end();
    } catch (e) {
        // Ignore close errors
    }
  }
};

export const likeGame = async (id: string): Promise<number> => {
    const client = getClient();
    await client.connect();
    try {
        const { rows } = await client.query(`
            UPDATE "SavedGame" 
            SET likes = likes + 1 
            WHERE id = $1 
            RETURNING likes
        `, [id]);
        return rows[0]?.likes || 0;
    } catch (error) {
        console.error("Failed to like game:", error);
        throw error;
    } finally {
        try {
            await client.end();
        } catch (e) {
            // Ignore close errors
        }
    }
};
