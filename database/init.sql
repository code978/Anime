-- Initialize the database with extensions and sample data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sample audio tracks
INSERT INTO audio_tracks (id, name, file_path, duration, genre, is_default) VALUES
  (uuid_generate_v4(), 'Upbeat Pop', 'audio/upbeat_pop.mp3', 120, 'Pop', true),
  (uuid_generate_v4(), 'Ambient Chill', 'audio/ambient_chill.mp3', 180, 'Ambient', true),
  (uuid_generate_v4(), 'Epic Adventure', 'audio/epic_adventure.mp3', 200, 'Epic', false),
  (uuid_generate_v4(), 'Kawaii Dreams', 'audio/kawaii_dreams.mp3', 150, 'Kawaii', false),
  (uuid_generate_v4(), 'Action Beat', 'audio/action_beat.mp3', 90, 'Action', false)
ON CONFLICT DO NOTHING;

-- Sample prompts (for demo purposes)
DO $$
DECLARE
    sample_user_id uuid;
BEGIN
    -- Check if sample data should be inserted
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'demo_user') THEN
        -- Create a demo user
        INSERT INTO users (id, email, username, password, first_name, is_verified)
        VALUES (
            uuid_generate_v4(),
            'demo@animeai.com',
            'demo_user',
            crypt('demo123', gen_salt('bf')),
            'Demo',
            true
        ) RETURNING id INTO sample_user_id;
        
        -- Create subscription for demo user
        INSERT INTO user_subscriptions (id, user_id, plan, status)
        VALUES (uuid_generate_v4(), sample_user_id, 'FREE', 'ACTIVE');
        
        -- Sample prompts
        INSERT INTO prompts (id, user_id, title, description, content, type, style, is_public) VALUES
          (uuid_generate_v4(), sample_user_id, 'Cute Anime Girl', 'A kawaii anime character', 'cute anime girl with pink hair, big eyes, school uniform, kawaii style', 'IMAGE', '{"art_style": "kawaii", "color_palette": "pastel"}', true),
          (uuid_generate_v4(), sample_user_id, 'Epic Battle Scene', 'Dynamic action sequence', 'epic anime battle scene, warriors fighting, dramatic lighting, action packed', 'VIDEO', '{"art_style": "anime", "color_palette": "vibrant", "mood": "action"}', true),
          (uuid_generate_v4(), sample_user_id, 'Peaceful Garden', 'Serene nature scene', 'peaceful japanese garden, cherry blossoms, anime style, soft lighting', 'IMAGE', '{"art_style": "realistic", "color_palette": "pastel", "mood": "peaceful"}', true);
    END IF;
END $$;