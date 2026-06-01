type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

const MaterialIcon = ({ name, className = '', filled = false }: MaterialIconProps) => {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
    >
      {name}
    </span>
  );
};

export default MaterialIcon;
