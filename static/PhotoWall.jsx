import React, { useState, useEffect, useRef } from 'react';
import './PhotoWall.css';

/**
 * Sean Tucker Style Photo Wall Component
 * 
 * Features:
 * - Masonry layout with preserved aspect ratios
 * - Responsive design (1 col mobile, 2 col tablet, 4 col desktop)
 * - Lightbox on click
 * - Hover effects
 * - Smooth animations
 */
const PhotoWall = ({ photos = [], title = "STREET", description = "" }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const gridRef = useRef(null);
  const [columns, setColumns] = useState(4);

  // Calculate columns based on screen size
  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1400) return 4;
      if (width >= 1024) return 3;
      if (width >= 768) return 2;
      return 1;
    };

    setColumns(calculateColumns());

    const handleResize = () => {
      setColumns(calculateColumns());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentIndex]);

  return (
    <div className="photo-wall-container">
      {(title || description) && (
        <div className="photo-wall-header">
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </div>
      )}

      <div 
        className="photo-wall-grid" 
        ref={gridRef}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {photos.map((photo, index) => (
          <div
            key={index}
            className="photo-item"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo.src}
              alt={photo.alt || `Photo ${index + 1}`}
              loading="lazy"
              onLoad={(e) => {
                e.target.parentElement.classList.add('loaded');
              }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="lightbox active" onClick={closeLightbox}>
          <span className="lightbox-close" onClick={closeLightbox}>
            &times;
          </span>
          <span
            className="lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            &#10094;
          </span>
          <span
            className="lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            &#10095;
          </span>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[currentIndex].src}
              alt={photos[currentIndex].alt || `Photo ${currentIndex + 1}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoWall;

