import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
  className?: string;
}

/** Star rating input tương tác (1-5 sao), hỗ trợ hover preview. */
const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 28,
  disabled = false,
  className = "",
}) => {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className={`flex items-center gap-1 ${className}`} role="radiogroup" aria-label="Số sao đánh giá">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} sao`}
            className={`transition-transform ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-110"}`}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => !disabled && setHover(0)}
          >
            <Star
              style={{ width: size, height: size }}
              className={
                star <= active
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRatingInput;
