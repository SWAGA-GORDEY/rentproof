import Image from "next/image";

export function UploadImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={960}
      height={600}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
