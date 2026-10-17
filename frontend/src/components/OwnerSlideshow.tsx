import React, { useState, useEffect, useRef } from "react";
import { ProjectSummary } from "../types/project";
import { contentService } from "../services/contentService";
import { StudioImage } from "./StudioImage";

export interface SlideshowItem {
  id: string | number;
  image_url: string;
  title: string;
  subtitle?: string;
  category?: string;
  location?: string;
  project_slug?: string;
}

interface OwnerSlideshowProps {
  projects: ProjectSummary[];
  onSelectProject: (slug: string) => void;
}

export const OwnerSlideshow: React.FC<OwnerSlideshowProps> = ({
  projects,
  onSelectProject
}) => {
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Load configured slideshow from CMS or fallback to top project photos
  useEffect(() => {
    let isMounted = true;
    contentService.getSectionContent<{ slides?: any[] } | null>("slideshow", null)
      .then((data) => {
        if (!isMounted) return;
        if (data?.slides && Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides.slice(0, 10));
        } else {
          // Derive fallback slides from projects (up to 10 photos)
          const fallback: SlideshowItem[] = [];
          for (const p of projects) {
            if (p.cover_image && fallback.length < 10) {
              fallback.push({
                id: `p-${p.id}`,
                image_url: p.cover_image,
                title: p.title,
                subtitle: p.location ? `${p.category} · ${p.location}` : p.category,
                category: p.category,
                location: p.location,
                project_slug: p.slug
              });
            }
          }
          if (fallback.length > 0) {
            setSlides(fallback);
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = projects.slice(0, 10).map((p) => ({
          id: `p-${p.id}`,
          image_url: p.cover_image || "/uploads/projects/placeholder.webp",
          title: p.title,
          subtitle: `${p.category} · ${p.location}`,
          category: p.category,
          location: p.location,
          project_slug: p.slug
        }));
        setSlides(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [projects]);

  // Autoplay 5-second interval
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  const handlePrev = () => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) {
      handleNext();
    } else if (diff < -threshold) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <section
      className="owner-cinematic-slideshow"
      aria-label="Featured Architectural Projects Slideshow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Stack */}
      <div className="slideshow-inner">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id || idx}
              className={`slideshow-slide ${isActive ? "active" : ""}`}
              style={{
                opacity: isActive ? 1 : 0,
                visibility: isActive ? "visible" : "hidden",
                transition: "opacity 0.9s cubic-bezier(0.25, 1, 0.5, 1)"
              }}
            >
              <StudioImage
                src={slide.image_url}
                alt={slide.title}
                className="slideshow-image"
                loading={idx === 0 ? "eager" : "lazy"}
                fallbackSrc="/uploads/projects/placeholder.webp"
              />
              <div className="slideshow-overlay" />
            </div>
          );
        })}
      </div>

      {/* Caption / Content Box */}
      <div className="slideshow-caption-container container">
        <div className="slideshow-content sd-fade-in" key={currentSlide.id || currentIndex}>
          {currentSlide.category && (
            <span className="slideshow-category-tag">
              {currentSlide.category}
            </span>
          )}
          <h2 className="slideshow-title">{currentSlide.title}</h2>
          {currentSlide.subtitle && (
            <p className="slideshow-subtitle">{currentSlide.subtitle}</p>
          )}

          {currentSlide.project_slug && (
            <button
              type="button"
              className="slideshow-cta-btn"
              onClick={() => onSelectProject(currentSlide.project_slug!)}
            >
              EXPLORE DOSSIER →
            </button>
          )}
        </div>
      </div>

      {/* Controls: Arrows & Indicators */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="slideshow-arrow slideshow-arrow-left"
            onClick={handlePrev}
            aria-label="Previous Slide"
          >
            ‹
          </button>
          <button
            type="button"
            className="slideshow-arrow slideshow-arrow-right"
            onClick={handleNext}
            aria-label="Next Slide"
          >
            ›
          </button>

          <div className="slideshow-pagination">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`slideshow-dot ${i === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="slideshow-progress-bar">
            <div
              key={currentIndex}
              className="slideshow-progress-fill"
              style={{
                animationDuration: isPaused ? "0s" : "5s"
              }}
            />
          </div>
        </>
      )}
    </section>
  );
};
