import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from, to } = await req.json();
    
    if (!from || !to) {
      return Response.json({ error: 'Missing currency codes' }, { status: 400 });
    }

    // Use frankfurter.app - free currency conversion API
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch conversion rate' }, { status: 500 });
    }

    const data = await response.json();
    const rate = data.rates[to];
    
    return Response.json({ 
      from,
      to,
      rate,
      date: data.date 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});