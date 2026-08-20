/* Riseva — génère le rapport trimestriel ou annuel d'une entreprise.
   GET /rapport?entreprise=<uuid>&saison=<uuid>&portee=annuel|trimestriel */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const entreprise = u.searchParams.get("entreprise");
  const saison = u.searchParams.get("saison");
  const portee = u.searchParams.get("portee") ?? "annuel";
  if (!entreprise || !saison) return new Response("paramètres manquants", { status: 400 });

  const { data: missions } = await sb.from("mission")
    .select("points, quantite, etat, annonce:annonce!inner(type, saison, association)")
    .eq("entreprise", entreprise)
    .in("etat", ["validee", "validee_auto"]);

  const retenues = (missions ?? []).filter((m: any) => m.annonce.saison === saison);
  const parType: Record<string, number> = {};
  let euros = 0, demiJournees = 0;
  const assos = new Set<string>();

  for (const m of retenues as any[]) {
    parType[m.annonce.type] = (parType[m.annonce.type] ?? 0) + m.points;
    assos.add(m.annonce.association);
    if (m.annonce.type === "don_financier") euros += Number(m.quantite);
    if (m.annonce.type === "benevolat_demi_journee") demiJournees += Number(m.quantite);
  }

  const { data: rang } = await sb.from("classement")
    .select("points, rang").eq("entreprise", entreprise).eq("saison", saison).single();

  const { data: equipe } = await sb.from("profil")
    .select("id").eq("entreprise", entreprise).eq("role", "salarie").eq("actif", true);

  return Response.json({
    portee, saison, entreprise,
    points: rang?.points ?? 0,
    rang: rang?.rang ?? null,
    missions: retenues.length,
    parType, euros, demiJournees,
    associations: assos.size,
    salaries: equipe?.length ?? 0,
    genere_le: new Date().toISOString()
  });
});
