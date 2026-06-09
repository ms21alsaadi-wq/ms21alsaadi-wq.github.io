import {
  isGoogleDriveVideo,
  normalizeVideoUrl,
} from "../../utils/helpers.js";

function HeroSection({ settings }) {
  const layout = settings.homeHeroLayout || "split";
  const title = settings.homeHeroTitle || "";
  const desc = settings.homeHeroDesc || "";
  const buttonText = settings.homeHeroButton ?? "تسوق الآن";
  const buttonLink = settings.homeHeroButtonLink || "#products";
  const image = settings.homeHeroImage || "";
  const bgImage = settings.homeHeroBgImage || "";
  const bannerImage = bgImage || image;
  const imagePosition = settings.homeHeroImagePosition || "left";
  const rawVideo = settings.homeHeroVideo || "";
  const video = normalizeVideoUrl(rawVideo);
  const driveVideo = isGoogleDriveVideo(rawVideo);

  const content = (
    <div className="hero-copy hero-dynamic-copy">
      <h1>{title}</h1>
      <p>{desc}</p>
      {buttonText?.trim() && (
        <div className="hero-actions">
          <a href={buttonLink} className="primary">
            {buttonText}
          </a>
        </div>
      )}
    </div>
  );

  if (layout === "video") {
    return (
      <section className="hero-full-media hero-video-mode">
        {video ? (
          driveVideo ? (
            <iframe
              className="hero-full-video hero-drive-video"
              src={video}
              title={title || "Hero Video"}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <video
              className="hero-full-video"
              src={video}
              autoPlay
              muted
              loop
              playsInline
            />
          )
        ) : image ? (
          <img
            className="hero-full-video"
            src={image}
            alt={title}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="hero-full-placeholder">
            ارفع فيديو الهيرو من لوحة التحكم
          </div>
        )}
        <div className="hero-media-overlay" />
        <div className="container hero-media-content">{content}</div>
      </section>
    );
  }

  if (layout === "banner") {
    return (
      <section className="hero-full-media hero-banner-mode">
        {bannerImage ? (
          <img
            className="hero-full-video"
            src={bannerImage}
            alt={title}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="hero-full-placeholder">
            ارفع بنر الهيرو من لوحة التحكم
          </div>
        )}
        <div className="hero-media-overlay light" />
        <div className="container hero-media-content centered">{content}</div>
      </section>
    );
  }

  return (
    <section
      className={`hero-layered hero-layered-${imagePosition}`}
      style={{
        backgroundImage: bgImage
          ? `linear-gradient(90deg, rgba(245,241,232,.86), rgba(245,241,232,.48)), url(${bgImage})`
          : undefined,
      }}
    >
      <div className="container hero-layered-inner">
        <div className="hero-layered-text">{content}</div>

        <div className="hero-layered-image-card">
          {image ? (
            <img src={image} alt={title} loading="eager" decoding="async" />
          ) : (
            <div className="hero-full-placeholder">
              ارفع الصورة الأمامية للهيرو
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
