"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface RatingModalProps {
  bookingId: string;
  ratedByProfileId: string;
  ratedProfileId: string;
  onClose: () => void;
}

export function RatingModal({ bookingId, ratedByProfileId, ratedProfileId, onClose }: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (stars === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("ratings").insert({
      booking_id: bookingId,
      rated_by_profile_id: ratedByProfileId,
      rated_profile_id: ratedProfileId,
      rating: stars,
      comment: comment.trim() || null,
    });
    if (dbError) {
      setError("Failed to submit rating. Please try again.");
      setSubmitting(false);
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
      <div style={{background:"white",borderRadius:"16px",padding:"2rem",maxWidth:"420px",width:"90%"}}>
        <h2 style={{fontSize:"20px",fontWeight:600,marginBottom:"4px"}}>Rate your companion</h2>
        <p style={{fontSize:"14px",color:"#6b7280",marginBottom:"20px"}}>How was your visit?</p>

        {/* Stars */}
        <div style={{display:"flex",gap:"8px",marginBottom:"20px"}}>
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{background:"none",border:"none",cursor:"pointer",padding:0}}
              aria-label={`${s} star${s !== 1 ? "s" : ""}`}
            >
              <Star
                style={{width:"36px",height:"36px",fill:(hovered||stars)>=s?"#f59e0b":"none",color:(hovered||stars)>=s?"#f59e0b":"#d1d5db",transition:"color 0.1s"}}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={4}
          style={{width:"100%",padding:"10px 12px",fontSize:"15px",border:"1px solid #e5e7eb",borderRadius:"8px",resize:"none",outline:"none",marginBottom:"16px",boxSizing:"border-box"}}
        />

        {error && <p style={{color:"#dc2626",fontSize:"14px",marginBottom:"12px"}}>{error}</p>}

        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit rating"}
          </Button>
        </div>
      </div>
    </div>
  );
}