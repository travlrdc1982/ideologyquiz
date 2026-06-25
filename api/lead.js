import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const lead = req.body;
    const result = lead.result || {};

    if (!lead.email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const row = {
      name: lead.name || null,
      email: lead.email,
      consent: !!lead.consent,
      source: lead.source || 'american-ideology-quiz',
      score: result.score ?? null,
      taxonomy: result.taxonomy || null,
      result_title: result.resultTitle || null,
      closest_position: result.closestMapPositionName || null,
      strongest_value: result.strongestCardinalValueName || null,
      weakest_value: result.weakestCardinalValueName || null,
      nearest_figure: result.nearestHistoricalFigure || null,
      x: result.coordinates?.x ?? null,
      y: result.coordinates?.y ?? null,
      nihilism_mean: result.nihilismMean ?? null,
      full_payload: lead
    };

    const { error } = await supabase
      .from('quiz_leads')
      .insert(row);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}