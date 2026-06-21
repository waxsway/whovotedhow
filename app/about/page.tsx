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

// Editorial reading layout. Serif body + sans heading, single column at a
// readable measure (~640px content), generous vertical rhythm, no card
// boxes. The styling here is intentionally restrained — this page is read,
// not navigated.

const SERIF =
  "var(--font-source-serif), Charter, 'Iowan Old Style', Georgia, Cambria, serif";
const SANS =
  "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif";

const sectionHeading: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: -0.2,
  color: "rgba(244,244,245,0.95)",
  marginTop: 64,
  marginBottom: 14,
};

const subHeading: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "rgba(244,244,245,0.55)",
  marginTop: 32,
  marginBottom: 10,
};

const body: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 18,
  lineHeight: 1.65,
  color: "rgba(244,244,245,0.82)",
  marginBottom: 18,
};

const small: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 15,
  lineHeight: 1.6,
  color: "rgba(244,244,245,0.6)",
};

const link: React.CSSProperties = {
  color: "rgba(244,244,245,0.95)",
  textDecoration: "underline",
  textDecorationColor: "rgba(244,244,245,0.3)",
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  margin: "56px 0",
};

const listStyle: React.CSSProperties = {
  ...body,
  paddingLeft: 22,
  marginTop: 0,
};

const orderedListStyle: React.CSSProperties = {
  ...body,
  paddingLeft: 24,
  marginTop: 0,
};

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f4f4f5",
        fontFamily: SANS,
      }}
    >
      {/* Top nav */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(244,244,245,0.85)",
            textDecoration: "none",
            letterSpacing: -0.2,
          }}
        >
          Who Voted How
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: SANS,
            fontSize: 13,
            color: "rgba(244,244,245,0.55)",
            textDecoration: "none",
          }}
        >
          ← Back to map
        </Link>
      </header>

      <article
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "72px 28px 120px",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "rgba(244,244,245,0.5)",
            marginBottom: 14,
          }}
        >
          Methodology
        </div>
        <h1
          style={{
            fontFamily: SANS,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1.2,
            lineHeight: 1.1,
            margin: 0,
            color: "#fafafa",
          }}
        >
          About Who Voted How
        </h1>
        <p
          style={{
            ...body,
            fontSize: 21,
            color: "rgba(244,244,245,0.78)",
            marginTop: 26,
            marginBottom: 26,
            lineHeight: 1.55,
          }}
        >
          A free political accountability map of the United States Congress.
          Every senator and representative gets a profile showing their recent
          roll-call votes, top campaign donors from FEC filings, and two
          alignment scores: did they vote the way they publicly said they
          would, and did they vote in the direction the people who elected
          them lean?
        </p>
        <p style={body}>
          This page documents exactly how every number on the site is computed
          and which public datasets are used. The goal is for every claim to
          be reproducible from the cited sources. If you can&apos;t reproduce a
          score, that&apos;s a bug — please open an issue.
        </p>

        <hr style={divider} />

        {/* DATA SOURCES */}
        <h2 style={{ ...sectionHeading, marginTop: 0 }}>Data sources</h2>

        <h3 style={subHeading}>Member roster + portraits</h3>
        <p style={body}>
          The list of every current member of Congress — name, party, state,
          district, chamber, term dates, FEC candidate IDs — comes from{" "}
          <a
            href="https://github.com/unitedstates/congress-legislators"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
          >
            unitedstates/congress-legislators
          </a>
          , a community-maintained YAML file built from official bioguide,
          Senate, and House sources. We parse the canonical file from the
          repo&apos;s main branch directly; no third-party mirror, no API
          key. Official portraits come from the matching{" "}
          <a
            href="https://github.com/unitedstates/images"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
          >
            unitedstates/images
          </a>{" "}
          mirror, keyed on bioguide ID.
        </p>

        <h3 style={subHeading}>Roll-call votes</h3>
        <p style={body}>
          Every roll-call vote — who voted Yea, Nay, Present, or Not Voting on
          every bill — comes from{" "}
          <a
            href="https://voteview.com"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
          >
            Voteview.com
          </a>
          , the canonical academic source for U.S. Congressional roll-call
          history maintained at UCLA. We pull rollcalls (bill metadata),
          votes (per-member casts), and members (the icpsr-to-bioguide
          mapping) for the 118th Congress (2023–2025) and 119th Congress
          (2025–) for both chambers.
        </p>
        <p style={body}>
          Vote-cast codes are decoded per the published Voteview methodology:
          1 is Yea, 6 is Nay, 7–8 are Present, 9 is Not Voting. Paired and
          announced votes are folded into their respective Yea / Nay buckets.
        </p>

        <h3 style={subHeading}>Donor data</h3>
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
          . For each legislator we resolve their principal campaign committee
          and fetch the employer-aggregated individual contributions for the
          requested cycle.
        </p>
        <p style={body}>
          One honest caveat. The FEC publishes raw employer strings as donors
          self-report them. Many entries are non-employer values
          (&ldquo;NOT EMPLOYED,&rdquo; &ldquo;SELF,&rdquo;
          &ldquo;RETIRED,&rdquo; &ldquo;INFORMATION REQUESTED&rdquo;). We
          filter those out before display and lightly normalize corporate
          suffixes (INC, LLC, GROUP, etc.) to merge near-duplicate spellings.
          This is less aggressive than the hand-curated employer-to-industry
          rollups OpenSecrets performs; it&apos;s also fully reproducible
          from FEC raw data without an opaque normalization layer. The dollar
          amount we display next to the filtered-junk total tells you how
          much of the candidate&apos;s individual contributions came from
          unidentifiable employers.
        </p>

        <h3 style={subHeading}>State partisan lean</h3>
        <p style={body}>
          Partisan lean of each state comes from the Cook Political Report
          Partisan Voter Index 2025 edition. PVI compares a state&apos;s
          presidential vote to the national average across the most recent
          two cycles. Positive values mean the state voted more Democratic
          than the country average; negative means more Republican.
        </p>
        <p style={body}>
          Source:{" "}
          <a
            href="https://www.cookpolitical.com/cook-pvi"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
          >
            cookpolitical.com/cook-pvi
          </a>
          . We currently apply state-level PVI to both senators and
          representatives. Real Cook PVI also publishes district-level values
          for the House — applying those is on the roadmap.
        </p>

        <h3 style={subHeading}>Stated positions</h3>
        <p style={body}>
          For each legislator we score on statement-vote alignment, the
          stance on each issue is sourced to a specific public statement —
          campaign website, official Senate or House page, or named
          third-party reporting. Every stance row in our registry carries the
          source URL, surfaced in the UI next to the stance so the reader can
          verify the receipt before trusting the score.
        </p>
        <p style={body}>
          This is hand-curated, not exhaustively scraped. Coverage is
          currently focused on high-profile senators across the political
          spectrum. Legislators we haven&apos;t curated yet fall back to a
          party-line consistency proxy with a clear label explaining that
          it&apos;s not the real statement-vote score. Adding a senator is
          one row in the registry; coverage grows over time.
        </p>

        <h3 style={subHeading}>Tagged roll-call bills</h3>
        <p style={body}>
          For each issue we score on, we maintain a registry of substantive
          landmark bills. Each entry pins a bill number to an issue and
          explicitly declares which cast direction (Yea or Nay) advances the
          &ldquo;favors&rdquo; stance on that issue.
        </p>
        <p style={body}>
          This replaces keyword matching against vote descriptions, which was
          producing false signals — procedural cloture motions hid bill
          substance behind generic language, and the engine couldn&apos;t
          tell a procedural defense of a bill from substantive opposition to
          it. Tagged matching is more honest about coverage (smaller initial
          set, but every match is verified) and handles cases where the bill
          itself was a regression — a bill restricting abortion rights, for
          example, where voting Nay actually supports reproductive rights
          even though &ldquo;Nay on the bill&rdquo; sounds like a no.
        </p>

        <hr style={divider} />

        {/* HOW SCORES ARE COMPUTED */}
        <h2 style={sectionHeading}>How the scores are computed</h2>

        <h3 style={subHeading}>Statement-vote alignment</h3>
        <p style={body}>
          For each issue the legislator has a sourced stance on:
        </p>
        <ol style={orderedListStyle}>
          <li style={{ marginBottom: 12 }}>
            Look up the tagged roll-call bills for that issue.
          </li>
          <li style={{ marginBottom: 12 }}>
            For each tagged bill, find the substantive roll calls (passage,
            cloture, or conference report) referencing that bill number in
            Voteview&apos;s data for the legislator&apos;s chamber.
          </li>
          <li style={{ marginBottom: 12 }}>
            Look up the legislator&apos;s cast on each of those roll calls.
          </li>
          <li style={{ marginBottom: 12 }}>
            Combine the cast with the tag&apos;s favors-direction declaration
            to determine: did this vote support the &ldquo;favors&rdquo;
            stance on this issue? Compare to the stated stance.
          </li>
          <li style={{ marginBottom: 12 }}>
            Count consistent vs inconsistent votes. An issue is
            &ldquo;aligned&rdquo; when at least half of the tagged votes were
            consistent. Overall percentage is the share of scoreable issues
            that came out aligned.
          </li>
        </ol>

        <h3 style={subHeading}>Constituent-vote alignment</h3>
        <p style={body}>
          For each legislator we look up their state&apos;s Cook PVI and
          decide a lean direction — D when PVI is at least +3, R when it&apos;s
          at most −3, or &ldquo;swing&rdquo; when the absolute value is under
          3. Then we compute their party-line consistency: how often they
          vote with the majority of their own party on recent roll calls.
        </p>
        <p style={body}>
          The constituent-alignment percentage combines the two. When the
          legislator&apos;s caucus party matches the state&apos;s lean,
          voting with their party IS voting with the state, so the score
          equals their party-line consistency. When the parties oppose,
          voting with their party is voting against the state — the score
          inverts to 100% minus their party-line consistency. Swing states
          don&apos;t get a single-number score; we surface the party-line
          consistency for context without forcing an alignment direction.
        </p>
        <p style={body}>
          Independents who caucus with one of the major parties (Bernie
          Sanders, Angus King) are scored against their caucus party.
        </p>

        <hr style={divider} />

        {/* LIMITATIONS */}
        <h2 style={sectionHeading}>Honest limitations</h2>

        <h3 style={subHeading}>Coverage is finite</h3>
        <p style={body}>
          Hand-curated stances and tagged bills don&apos;t yet cover every
          legislator or every issue. Where coverage is missing the site tells
          you so explicitly — no fake number, no &ldquo;coming soon&rdquo;
          placeholder where a real score should be.
        </p>

        <h3 style={subHeading}>Donor data is employer-aggregated, not industry-aggregated</h3>
        <p style={body}>
          We surface the cleaned FEC employer aggregation, not the
          industry-rolled-up &ldquo;Top Contributors&rdquo; view OpenSecrets
          hand-curates. Both are valid; the FEC version has the advantage
          that every dollar can be traced through public filings without an
          opaque normalization step.
        </p>

        <h3 style={subHeading}>House district-level PVI is not yet applied</h3>
        <p style={body}>
          Cook PVI publishes per-district values for the House too. We
          currently apply state-level PVI to representatives as a coarse
          approximation. A moderate Democrat in a heavily Republican district
          of an evenly-split state can read as &ldquo;in step&rdquo; with
          their state when in fact they&apos;re out of step with their
          district.
        </p>

        <h3 style={subHeading}>This is decision support, not a verdict</h3>
        <p style={body}>
          Roll-call votes are often pressured by procedural strategy,
          amendment positioning, and party leadership. A single
          &ldquo;inconsistent&rdquo; vote on an issue is not proof that a
          legislator betrayed their stated position — it&apos;s a starting
          point for further investigation. The system surfaces patterns, not
          gotchas.
        </p>

        <hr style={divider} />

        {/* OPEN SOURCE + WHAT THIS IS NOT */}
        <h2 style={sectionHeading}>Open source</h2>
        <p style={body}>
          The site code lives at{" "}
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

        <h2 style={sectionHeading}>What this is not</h2>
        <p style={body}>
          The site does not endorse any candidate or party. It does not rate
          legislators as &ldquo;good&rdquo; or &ldquo;bad.&rdquo; Every score
          is a documented calculation from public sources; the political
          interpretation is yours. We aim for the methodology to be something
          a skeptic of any partisan persuasion could audit, run, and either
          accept or specifically dispute. If something on the site
          doesn&apos;t meet that bar, we want to fix it.
        </p>

        <hr style={divider} />

        {/* ATTRIBUTION FOOTER */}
        <div style={small}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "rgba(244,244,245,0.55)",
              marginBottom: 12,
            }}
          >
            Data attribution
          </div>
          <div style={{ marginBottom: 6 }}>
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
          <div style={{ marginBottom: 6 }}>
            Roll-call votes:{" "}
            <a href="https://voteview.com" style={link}>
              Voteview.com
            </a>{" "}
            (UCLA)
          </div>
          <div style={{ marginBottom: 6 }}>
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
      </article>
    </main>
  );
}
