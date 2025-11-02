import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:5003';

async function createGrievance() {
  const body = {
    title: 'Test grievance for duplicate vote',
    description: 'This is a long description to meet the minimum validation. '.repeat(5),
    category: 'Other',
    villageName: 'Demo Village',
    fullName: 'Test User',
    mobileNumber: '+911234567890',
  };

  const resp = await fetch(`${BASE}/api/grievances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Failed to create grievance: ' + JSON.stringify(data));
  return data.id || data; // return id or object
}

async function sendVote(grievanceId) {
  const resp = await fetch(`${BASE}/api/grievances/${grievanceId}/community-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voteType: 'verify', comments: 'Simultaneous vote' }),
  });
  const json = await resp.json();
  return { status: resp.status, body: json };
}

async function getVerifications(grievanceId) {
  const resp = await fetch(`${BASE}/api/verifications/${grievanceId}`);
  return await resp.json();
}

(async () => {
  try {
    console.log('Creating grievance...');
    const g = await createGrievance();
    const grievanceId = typeof g === 'string' ? g : g.id || g.grievanceNumber || g; // try id
    console.log('Grievance created:', grievanceId);

    // Fire 6 parallel votes
    const voters = 6;
    console.log(`Sending ${voters} parallel votes...`);
    const promises = [];
    for (let i = 0; i < voters; i++) promises.push(sendVote(grievanceId));

    const results = await Promise.all(promises);
    console.log('Vote results:');
    results.forEach((r, i) => console.log(i, r.status, JSON.stringify(r.body)));

    // Wait a bit and then fetch verifications
    await new Promise(res => setTimeout(res, 2000));
    const verifs = await getVerifications(grievanceId);
    console.log('Verifications count:', Array.isArray(verifs) ? verifs.length : JSON.stringify(verifs));
    if (Array.isArray(verifs)) console.log('Verifications:', verifs.map(v => ({ id: v.id, userId: v.userId, verificationType: v.verificationType })));
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
