import { thumbnailUrl } from "@/lector/video/youtube";

/** A video's thumbnail; just its grey box when it can't be loaded. */
export default function Thumbnail({ id }: { id: string }) {
  return (
    <img
      className="video-row__thumb"
      src={thumbnailUrl(id)}
      alt=""
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
