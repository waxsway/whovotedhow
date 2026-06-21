import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About & Methodology — Who Voted How",
  description:
    "How Who Voted How works. Every data source, every calculation, every honest limitation, fully documented. Public-record political accountability with citations.",
  alternates: { canonical: "https://whovotedhow.org/about" },
  openGraph: {
    title: "About & Methodology — Who Voted How",
    description:
      "Every data source and calculation, fully documented. Public-record political accountability with citations.",
    url: "https://whovotedhow.org/about",
    siteName: "Who Voted How",
  },
  twitter: {
    card: "summary_large_image",
    title: "About & Methodology — Who Voted How",
    description:
      "How Who Voted How works — every data source, every calculation, every honest limitation.",
  },
};

const sectionTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: -0.5,
  color: "#f4f4f5",
  marginTop: 56,
  marginBottom: 18,
};
const sectionTitleFirst: React.CSSProperties = { ...sectionTitle, marginTop: 0 };
const subTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "rgba(244,244,245,0.88)",
  marginTop: 28,
  marginBottom: 8,
};
const body: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "rgba(244,244,245,0.72)",
  marginBottom: 14,
};
const link: React.CSSProperties = {
  color: "rgba(196,181,253,0.95)",
  textDecoration: "underline",
};
const codePill: React.CSSProperties = {
  fontFamily:
    "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
  fontSize: 12.5,
  padding: "2px 7px",
  borderRadius: 5,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(244,244,245,0.85)",
};
const cardBox: React.CSSProperties = {
  padding: "18px 20px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  marginBottom: 14,
};
const tableLike: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05060a",
        color: "#f4f4f5",
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "56px 24px 96px",
        }}
      >
        <nav style={{ marginBottom: 32, fontSize: 13 }}>
          <Link
            href="/"
            style={{
              color: "rgba(244,244,245,0.55)",
              textDecoration: "none",
            }}
          >
            ← Back to map
          </Link>
        </nav>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            marginBottom: 16,
          }}
        >
          About &amp; Methodology
        </h1>
        <p style={{ ...body, fontSize: 18, color: "rgba(244,244,245,0.78)" }}>
          Who Voted How is a free political accountability map of the United
          States Congress. Every senator and representative gets a profile
          showing their recent roll-call votes, top donors from FEC filings,
          and two alignment scores: statement-vs-vote (did they vote how they
          said they would?) and constituent-vs-vote (did they vote in the
          direction the people who elected them lean?).
        </p>
        <p style={body}>
          This page documents exactly how every number on the site is computed,
          which public datasets are used, and where the methodology has honest
          limitations. The goal is for every claim to be verifiable from the
          public record. If you can&apos;t reproduce a score from the cited
          sources, that&apos;s a bug — please report it.
        </p>

        <h2 style={sectionTitle}>Data sources</h2>

        <div style={cardBox}>
          <div style={subTitle}>Member roster + photographs</div>
          <p style={body}>
            The list of every current member of Congress — name, party, state,
            district, chamber, term dates, FEC candidate IDs — comes from the{" "}
            <a
              href="https://github.com/unitedstates/congress-legislators"
              target="_blank"
              rel="noopener noreferrer"
              style={link}
            >
              unitedstates/congress-legislators
            </a>{" "}
            project on GitHub. The data is community-maintained from official
            sources (bioguide.house.gov, senate.gov, house.gov) and refreshed
            continuously. We parse the canonical YAML file directly from the
            repo&apos;s main branch — no third-party mirror, no API key.
          </p>
          <p style={body}>
            Official portraits come from the{" "}
            <a
              href="https://github.com/unitedstates/images"
              target="_blank"
              rel="noopener noreferrer"
              style={link}
            >
              unitedstates/images
            </a>{" "}
            mirror on GitHub. Each member&apos;s bioguide ID is the filename
            of their portrait. New members occasionally lack a portrait until
            it&apos;s added upstream; the site falls back to a clean &ldquo;no
            photo&rdquo; placeholder in that case.
          </p>
        </div>

        <div style={cardBox}>
          <div style={subTitle}>Roll-call votes</div>
          <p style={body}>
            Every roll-call vote — who voted Yea, Nay, Present, or Not Voting
            on every bill — comes from{" "}
            <a
              href="https://voteview.com"
              target="_blank"
              rel="noopener noreferrer"
              style={link}
            >
              Voteview.com
            </a>
            , the canonical academic source for U.S. Congressional roll-call
            history maintained at UCLA. We pull three files per Congress per
            chamber: rollcalls (bill metadata), votes (per-member casts), and
            members (icpsr-to-bioguide mapping). Currently the site loads the
            118th Congress (2023–2025) and 119th Congress (2025–) for both
            chambers.
          </p>
          <p style={body}>
            Vote-cast codes are decoded per the published Voteview methodology:{" "}
            <span style={codePill}>1</span> = Yea,{" "}
            <span style={codePill}>6</span> = Nay,{" "}
            <span style={codePill}>7</span>–<span style={codePill}>8</span> =
            Present, <span style={codePill}>9</span> = Not Voting. Paired and
            announced votes are folded into their respective Yea/Nay buckets.
          </p>
        </div>

        <div style={cardBox}>
          <div style={subTitle}>Donor data</div>
          <p style={body}>
            All campaign donor data comes directly from the U.S. Federal
            Election Commission via{" "}
            <a
              href="https://api.open.fec.gov"
              target="_blank"
              rel="noopener noreferrer"
              style={link}
            >
              api.open.fec.gov
            </a>
            . For each legislator we look up their principal campaign committee
            (<span style={codePill}>designation=P</span>) and fetch the
            employer-aggregated individual contributions for the requested
            cycle.
          </p>
          <p style={body}>
            Important honest caveat: the FEC publishes raw employer strings as
            self-reported by donors. Many entries are non-employer values
            (&ldquo;NOT EMPLOYED&rdquo;, &ldquo;SELF&rdquo;,
            &ldquo;RETIRED&rdquo;, &ldquo;INFORMATION REQUESTED&rdquo;). We
            filter those out before display, and we lightly normalize
            corporate suffixes (INC, LLC, GROUP, etc.) to merge near-duplicate
            spellings of the same company. This is less aggressive than the
            hand-curated employer-to-industry rollups OpenSecrets performs;
            it&apos;s also fully reproducible from FEC raw data without an
            opaque middle layer. The dollar amount we display next to a
            filtered junk-value total tells you how much of the candidate&apos;s
            individual contributions came from unidentifiable employers.
          </p>
        </div>

        <div style={cardBox}>
          <div style={subTitle}>State partisan lean</div>
          <p style={body}>
            Partisan lean of each state comes from the Cook Political Report
            Partisan Voter Index (PVI) 2025 edition. PVI compares a
            state&apos;s presidential vote to the national average across the
            most recent two cycles; positive values mean the state voted more
            Democratic than the country average, negative means more
            Republican.
          </p>
          <p style={body}>
            Source: Cook Political Report with Amy Walter,{" "}
            <a
              href="https://www.cookpolitical.com/cook-pvi"
              target="_blank"
              rel="noopener noreferrer"
              style={link}
            >
              cookpolitical.com/cook-pvi
            </a>
            . Currently we apply state-level PVI to both senators and
            representatives. Real Cook PVI also publishes district-level
            values for the House — applying those is on the roadmap.
          </p>
        </div>

        <div style={cardBox}>
          <div style={subTitle}>Stated positions (hand-curated)</div>
          <p style={body}>
            For each legislator we score on statement-vote alignment, the
            stance on each issue is sourced to a specific public statement —
            campaign website, official Senate or House page, or named
            third-party reporting. Every stance row in our registry carries
            the source URL, surfaced in the UI next to the stance so you can
            verify the receipt.
          </p>
          <p style={body}>
            Honest limitation: this is hand-curated, not exhaustively scraped.
            Coverage is currently focused on high-profile senators across the
            political spectrum. Legislators we haven&apos;t curated yet fall
            back to a party-line consistency proxy with a clear label
            explaining that it&apos;s not the real statement-vs-vote score.
            Adding a senator = adding a row to the registry; coverage will
            grow over time.
          </p>
        </div>

        <div style={cardBox}>
          <div style={subTitle}>Tagged roll-call bills</div>
          <p style={body}>
            For each issue we score on, we maintain a registry of substantive
            landmark bills. Each entry pins a (congress, chamber, bill_number)
            to an issue and explicitly declares which cast direction
            (&ldquo;Yea&rdquo; or &ldquo;Nay&rdquo;) advances the
            &ldquo;favors&rdquo; stance on that issue.
          </p>
          <p style={body}>
            This replaces keyword matching against vote descriptions, which
            was producing false signals — procedural cloture motions hid bill
            substance behind generic language, and the engine couldn&apos;t
            tell a procedural defense of a bill from substantive opposition to
            it. Tagged matching is more honest about coverage (smaller
            initial set, but every match is verified) and handles cases
            where the bill itself was a regression (a bill restricting
            abortion rights: voting Nay = supporting reproductive rights,
            even though &ldquo;Nay on the bill&rdquo; sounds like a no).
          </p>
        </div>

        <h2 style={sectionTitle}>How the scores are computed</h2>

        <h3 style={subTitle}>Statement-vote alignment</h3>
        <p style={body}>
          For each issue the legislator has a sourced stance on:
        </p>
        <ol style={{ ...body, paddingLeft: 22, marginBottom: 14 }}>
          <li>Look up the tagged roll-call bills for that issue.</li>
          <li>
            For each tagged bill, find the substantive roll calls (passage,
            cloture, or conference report) referencing that bill number in
            Voteview&apos;s data for the legislator&apos;s chamber.
          </li>
          <li>Look up the legislator&apos;s cast on each of those roll calls.</li>
          <li>
            Combine the cast with the tag&apos;s favors-direction declaration
            to determine: did this vote support the &ldquo;favors&rdquo;
            stance on this issue? Compare to the legislator&apos;s stated
            stance.
          </li>
          <li>
            Count consistent vs inconsistent votes. An issue is &ldquo;aligned&rdquo;
            when at least half of the tagged votes were consistent.
          </li>
          <li>
            Overall percentage = (issues aligned ÷ issues scoreable) × 100.
            Issues with no matching tagged votes are surfaced as
            &ldquo;no matching votes yet&rdquo; rather than counted in the
            denominator.
          </li>
        </ol>

        <h3 style={subTitle}>Constituent-vote alignment</h3>
        <p style={body}>
          For each legislator:
        </p>
        <ol style={{ ...body, paddingLeft: 22, marginBottom: 14 }}>
          <li>
            Look up their state&apos;s Cook PVI. Direction is &ldquo;D&rdquo;
            when PVI ≥ +3, &ldquo;R&rdquo; when PVI ≤ −3, or
            &ldquo;EVEN&rdquo; when |PVI| &lt; 3 (swing states).
          </li>
          <li>
            Compute the legislator&apos;s party-line consistency: for each
            recent roll call where their party had a clear majority position,
            did they vote with that majority? Score = % with party.
          </li>
          <li>
            Compare the legislator&apos;s caucus party to the state&apos;s
            lean direction.
            <br />
            <span style={{ color: "rgba(244,244,245,0.55)", fontSize: 14 }}>
              — Matches (D senator in D state, R senator in R state):
              constituent alignment = party-line consistency.
            </span>
            <br />
            <span style={{ color: "rgba(244,244,245,0.55)", fontSize: 14 }}>
              — Opposes (D senator in R state, R senator in D state):
              constituent alignment = 100% − party-line consistency.
              Their party-line votes are AGAINST their state&apos;s lean;
              their breaks with party are WITH the state&apos;s lean.
            </span>
            <br />
            <span style={{ color: "rgba(244,244,245,0.55)", fontSize: 14 }}>
              — Swing state (|PVI| &lt; 3): no single-number alignment is
              computed; UI shows party-line consistency for context only,
              because the state&apos;s electorate is too closely divided to
              clearly assign an &ldquo;in step&rdquo; direction.
            </span>
          </li>
        </ol>
        <p style={body}>
          Independents who caucus with one of the major parties (Bernie
          Sanders, Angus King) are scored against their caucus party.
        </p>

        <h2 style={sectionTitle}>Honest limitations</h2>

        <div style={tableLike}>
          <div style={cardBox}>
            <div style={subTitle}>Coverage is finite.</div>
            <p style={body}>
              Hand-curated stances and tagged bills don&apos;t yet cover every
              legislator or every issue. Where coverage is missing the site
              tells you so explicitly — no fake number, no &ldquo;coming
              soon&rdquo; placeholder where a real score should be.
            </p>
          </div>
          <div style={cardBox}>
            <div style={subTitle}>Donor data shows employer-aggregated, not industry-aggregated.</div>
            <p style={body}>
              FEC publishes employer strings as donors self-report them.
              We surface the cleaned employer aggregation, not the
              industry-rolled-up &ldquo;Top Contributors&rdquo; view OpenSecrets
              hand-curates. Both are valid; the FEC version has the advantage
              that every dollar can be traced through public filings without
              an opaque normalization step.
            </p>
          </div>
          <div style={cardBox}>
            <div style={subTitle}>House district-level PVI is not yet applied.</div>
            <p style={body}>
              Cook PVI also publishes per-district values for the House. We
              currently apply state-level PVI to representatives as a coarse
              approximation. This means a moderate Democrat in a heavily
              Republican district of an evenly-split state can read as
              &ldquo;in step&rdquo; with their state when in fact they&apos;re
              out of step with their district.
            </p>
          </div>
          <div style={cardBox}>
            <div style={subTitle}>This is decision support, not a verdict.</div>
            <p style={body}>
              Roll-call votes are often pressured by procedural strategy,
              amendment positioning, and party leadership. A single
              &ldquo;inconsistent&rdquo; vote on an issue is not proof that a
              legislator betrayed their stated position — it&apos;s a
              starting point for further investigation. The system surfaces
              patterns, not gotchas.
            </p>
          </div>
        </div>

        <h2 style={sectionTitle}>Open source &amp; contributions</h2>
        <p style={body}>
          The site code is open source at{" "}
          <a
            href="https://github.com/waxsway/whovotedhow"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
          >
            github.com/waxsway/whovotedhow
          </a>
          . If you spot an incorrect stance, a misclassified tagged bill, or
          a Cook PVI value that&apos;s out of date, open an issue or a pull
          request. The registries are intentionally human-editable — each new
          curated stance or tagged bill is one row.
        </p>

        <h2 style={sectionTitle}>What this is not</h2>
        <p style={body}>
          This site does not endorse any candidate or party. It does not rate
          legislators as &ldquo;good&rdquo; or &ldquo;bad.&rdquo; Every score
          is a documented calculation from public sources; the political
          interpretation is left to you. We aim for the methodology to be
          something a skeptic of any partisan persuasion could audit, run,
          and either accept or specifically dispute. If something on the site
          doesn&apos;t meet that bar, we want to fix it.
        </p>

        <div
          style={{
            marginTop: 56,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 13,
            color: "rgba(244,244,245,0.45)",
            lineHeight: 1.7,
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: "rgba(244,244,245,0.7)" }}>
              Data attribution:
            </strong>
          </div>
          <div>
            Roster + portraits:{" "}
            <a
              href="https://github.com/unitedstates/congress-legislators"
              style={link}
            >
              unitedstates/congress-legislators
            </a>
            ,{" "}
            <a href="https://github.com/unitedstates/images" style={link}>
              unitedstates/images
            </a>
          </div>
          <div>
            Roll-call votes:{" "}
            <a href="https://voteview.com" style={link}>
              Voteview.com
            </a>{" "}
            (UCLA)
          </div>
          <div>
            Donor records:{" "}
            <a href="https://api.open.fec.gov" style={link}>
              api.open.fec.gov
            </a>{" "}
            (U.S. Federal Election Commission)
          </div>
          <div>
            State partisan lean:{" "}
            <a href="https://www.cookpolitical.com/cook-pvi" style={link}>
              Cook Political Report PVI 2025
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
