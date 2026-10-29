import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentActivity } from "./agent-activity";

test("activity previews are source data, with no research claim for a greeting", () => {
  const greeting = renderToStaticMarkup(<AgentActivity activities={[]} stopped={false} failed={false} isStopping={false} />);
  expect(greeting).toContain("Connexion à l’assistant");
  expect(greeting).not.toContain("Les passages repérés");
  const research = renderToStaticMarkup(<AgentActivity stopped={false} failed={false} isStopping={false} activities={[{
    type: "brh.activity", turn_id: "t1", id: "q1", stage: "search", status: "complete",
    query: "inflation 2024", result_count: 1,
    sources: [{ title: "Rapport BRH", page: 7, excerpt: "<script>source</script>" }],
  }]} />);
  expect(research).toContain("inflation 2024");
  expect(research).toContain("Rapport BRH");
  expect(research).toContain("p. 7");
  expect(research).toContain("&lt;script&gt;");
  expect(research).not.toContain("<script>");
});

test("cancel and connection failure have explicit separate labels", () => {
  const stopped = renderToStaticMarkup(<AgentActivity activities={[]} stopped failed={false} isStopping={false} />);
  const failed = renderToStaticMarkup(<AgentActivity activities={[]} stopped failed isStopping={false} />);
  expect(stopped).toContain("Traitement interrompu");
  expect(failed).toContain("Connexion interrompue");
});
