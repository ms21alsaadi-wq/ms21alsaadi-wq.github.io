function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default Feature;
