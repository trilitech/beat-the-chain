export default function HowToPlayContent() {
  return (
    <>
      <div className="mt-6 text-dark-main font-mono">
        <p className="mt-2 text-dark-dim">
          <span className="text-white">Etherlink 6.0</span> just unlocked <span className="text-white">Instant Confirmations</span>, about <span className="text-white">10–20ms</span> per letter.
        </p>
        <p className="mt-2 text-dark-dim">
          Blink and you'll miss it. Can your typing keep up?
        </p>
      </div>

      <div className="mt-6 text-dark-main font-mono">
        <h2 className="text-xl font-bold">How to Play</h2>
        <ol className="list-none space-y-3 mt-3 text-dark-dim">
          <li className="flex items-center">
            <i className="fa fa-tachometer h-5 w-5 text-dark-highlight mr-3 shrink-0" />
            <span><span className="font-bold text-dark-main">Type fast:</span> Finish the text before the timer runs out</span>
          </li>
          <li className="flex items-center">
            <i className="fa fa-bullseye h-5 w-5 text-dark-highlight mr-3 shrink-0" />
            <span><span className="font-bold text-dark-main">Stay accurate:</span> Mistakes lower your score</span>
          </li>
          <li className="flex items-center">
            <i className="fa fa-trophy h-5 w-5 text-dark-highlight mr-3 shrink-0" />
            <span><span className="font-bold text-dark-main">Get ranked:</span> Your speed = your blockchain match</span>
          </li>
        </ol>
      </div>

      <div className="mt-6 rounded-lg border border-dark-dim/30 bg-dark-bg/50 p-4 text-sm font-mono">
        <div className="text-dark-main">
          <div className="mb-3">
            <span className="font-bold text-dark-highlight">Blockchain Speed Ranks</span>
          </div>
        </div>
        <ul className="list-none space-y-1.5 text-sm text-dark-dim">
          <li><span className="font-bold text-dark-main">Etherlink:</span> ≤20ms - Teleport mode 🤯 (Instant)</li>
          <li><span className="font-bold text-dark-main">Base / Unichain:</span> ≤200ms - Lightning ⚡</li>
          <li><span className="font-bold text-dark-main">Solana:</span> 201-400ms - Rocket 🚀</li>
          <li><span className="font-bold text-dark-main">Other ETH L2s:</span> 401-1000ms - Fast-ish 🏃</li>
          <li><span className="font-bold text-dark-main">Polygon:</span> 1.1-2s - Coffee-break speed ☕</li>
          <li><span className="font-bold text-dark-main">Ethereum Mainnet:</span> 2.1-12s - Give-me-a-sec…⏳</li>
          <li><span className="font-bold text-dark-main">Bitcoin:</span> &gt;12s - Stop-for-lunch 🐢</li>
        </ul>
      </div>
    </>
  );
}

