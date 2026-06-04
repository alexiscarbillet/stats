const fs = require('fs').promises;
const path = require('path');

async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchAllPages(url, headers = {}) {
  const items = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) throw new Error(`${nextUrl} -> ${res.status} ${res.statusText}`);
    const page = await res.json();
    if (!Array.isArray(page)) break;
    items.push(...page);
    const link = res.headers.get('link');
    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>; rel="next"/);
      nextUrl = match ? match[1] : null;
    } else {
      nextUrl = null;
    }
  }

  return items;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const cfgPath = path.join(repoRoot, 'config.json');
  const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));

  await fs.mkdir(path.join(repoRoot, 'data'), { recursive: true });
  await fs.mkdir(path.join(repoRoot, 'web', 'public', 'data'), { recursive: true });

  const out = { fetched_at: new Date().toISOString() };

  const writeJson = async (name, payload) => {
    const rootPath = path.join(repoRoot, 'data', name)
    const publicPath = path.join(repoRoot, 'web', 'public', 'data', name)
    await fs.writeFile(rootPath, JSON.stringify(payload, null, 2))
    await fs.writeFile(publicPath, JSON.stringify(payload, null, 2))
  }

  // Duolingo
  try {
    const duoUrl = `https://www.duolingo.com/2017-06-30/users?username=${cfg.duolingo_username}`;
    const duo = await fetchJSON(duoUrl, { 'User-Agent': 'github-actions' });
    const duoUser = duo.users?.[0] ?? duo;
    await writeJson('duolingo.json', { profile: duoUser, raw: duo, fetched_at: out.fetched_at });
    console.log('Duolingo data saved');
  } catch (e) {
    console.error('Duolingo fetch failed:', e.message);
  }

  // GitHub
  try {
    const ghHeaders = {
      Accept: 'application/vnd.github+json'
    };
    if (process.env.GITHUB_PAT) ghHeaders.Authorization = `token ${process.env.GITHUB_PAT}`;

    const ghUser = await fetchJSON(`https://api.github.com/users/${cfg.github_username}`, ghHeaders);
    const repos = await fetchAllPages(`https://api.github.com/users/${cfg.github_username}/repos?per_page=100&type=owner&sort=updated`, ghHeaders);

    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
    const languages = repos.reduce((map, repo) => {
      if (repo.language) {
        map[repo.language] = (map[repo.language] || 0) + 1;
      }
      return map;
    }, {});
    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }));
    const topRepos = repos
      .slice()
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 5)
      .map(repo => ({
        name: repo.name,
        url: repo.html_url,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
      }));

    const recentRepos = repos
      .slice()
      .filter(repo => repo.pushed_at)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 5)
      .map(repo => ({
        name: repo.name,
        url: repo.html_url,
        language: repo.language,
        pushed_at: repo.pushed_at,
        description: repo.description,
      }));

    const countRecent = (days) => {
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000
      return repos.filter(repo => repo.pushed_at && new Date(repo.pushed_at).getTime() >= threshold).length
    }

    const active30 = countRecent(30)
    const active90 = countRecent(90)

    const prCount = await fetchJSON(
      `https://api.github.com/search/issues?q=author:${cfg.github_username}+type:pr`,
      ghHeaders
    ).then(data => data.total_count)
      .catch(() => null);

    const mergedPrCount = await fetchJSON(
      `https://api.github.com/search/issues?q=author:${cfg.github_username}+type:pr+is:merged`,
      ghHeaders
    ).then(data => data.total_count)
      .catch(() => null);

    await writeJson('github.json', {
      profile: ghUser,
      repos,
      aggregates: {
        totalStars,
        totalForks,
        repoCount: repos.length,
        topLanguages,
        topRepos,
        recentRepos,
        active30,
        active90,
      },
      prCount,
      mergedPrCount,
      fetched_at: out.fetched_at,
    });
    console.log('GitHub data saved');
  } catch (e) {
    console.error('GitHub fetch failed:', e.message);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
