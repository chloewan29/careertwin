type Props = {
    capabilities: string[];
};

export function WhyFitList(props: Props) {
    const rows = props.capabilities.slice(0, 3);
    return (
        <section className="ctsp-card">
            <h2>Why you fit</h2>
            {rows.length === 0 ? (
                <p className="ctsp-empty">No strong matched capabilities in this snapshot.</p>
            ) : (
                <ul className="ctsp-why-list">
                    {rows.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}
