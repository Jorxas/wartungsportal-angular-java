import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Lokale Einzelbenutzung; Aufträge leben nur bis zum Ende des Prozesses. */
public class Main {
    record Wartungsauftrag(String kennung, String bezeichnung, String prioritaet, String zustand) {
        String alsJson() {
            return "{\"kennung\":" + Json.zeichenkette(kennung)
                + ",\"bezeichnung\":" + Json.zeichenkette(bezeichnung)
                + ",\"prioritaet\":" + Json.zeichenkette(prioritaet)
                + ",\"zustand\":" + Json.zeichenkette(zustand) + "}";
        }
    }

    private final Map<String, Wartungsauftrag> auftraege = new LinkedHashMap<>();
    private int naechsteNummer = 1;

    private Main(Path beispieldatei) throws IOException {
        for (Map<String, String> felder : new Json(Files.readString(beispieldatei)).listeLesen()) {
            verlangen(felder.keySet().equals(Set.of("kennung", "bezeichnung", "prioritaet", "zustand")));
            String kennung = felder.get("kennung");
            verlangen(kennung.matches("A[0-9]{2,}"));
            eingabePruefen(felder.get("bezeichnung"), felder.get("prioritaet"));
            verlangen(Set.of("offen", "erledigt").contains(felder.get("zustand")));
            verlangen(!auftraege.containsKey(kennung));
            auftraege.put(kennung, new Wartungsauftrag(kennung, felder.get("bezeichnung"),
                felder.get("prioritaet"), felder.get("zustand")));
            naechsteNummer = Math.max(naechsteNummer, Math.addExact(Integer.parseInt(kennung.substring(1)), 1));
        }
    }

    private static void verlangen(boolean gueltig) {
        if (!gueltig) throw new IllegalArgumentException("Ungültige Eingabe.");
    }

    private static void eingabePruefen(String bezeichnung, String prioritaet) {
        int laenge = bezeichnung.codePointCount(0, bezeichnung.length());
        verlangen(laenge >= 1 && laenge <= 120);
        verlangen(bezeichnung.codePoints().anyMatch(zeichen ->
            !Character.isWhitespace(zeichen) && !Character.isSpaceChar(zeichen) && zeichen != 0x85));
        verlangen(Set.of("normal", "hoch").contains(prioritaet));
    }

    private static void antworten(HttpExchange austausch, int status, String json) throws IOException {
        byte[] inhalt = json.getBytes(StandardCharsets.UTF_8);
        austausch.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        austausch.sendResponseHeaders(status, inhalt.length);
        austausch.getResponseBody().write(inhalt);
    }

    private static void fehler(HttpExchange austausch, int status, String code, String meldung) throws IOException {
        antworten(austausch, status, "{\"code\":" + Json.zeichenkette(code)
            + ",\"meldung\":" + Json.zeichenkette(meldung) + "}");
    }

    // Der Standardexecutor führt die Anfragen nacheinander aus.
    private void bearbeiten(HttpExchange austausch) throws IOException {
        try {
            String pfad = austausch.getRequestURI().getPath();
            boolean sammlung = pfad.equals("/auftraege");
            boolean detail = pfad.startsWith("/auftraege/") && pfad.substring(11).indexOf('/') < 0;
            if (!sammlung && !detail) {
                fehler(austausch, 404, "route_nicht_gefunden", "Die angefragte Route wurde nicht gefunden.");
                return;
            }
            String methode = austausch.getRequestMethod();
            if (!methode.equals("GET") && !(sammlung && methode.equals("POST"))) {
                austausch.getResponseHeaders().set("Allow", sammlung ? "GET, POST" : "GET");
                fehler(austausch, 405, "methode_nicht_erlaubt", "Diese Methode ist für die Route nicht verfügbar.");
                return;
            }
            verlangen(austausch.getRequestURI().getRawQuery() == null);
            String kennung = detail ? pfad.substring(11) : null;
            if (detail) verlangen(kennung.matches("A[0-9]{2,}"));
            byte[] rumpf = austausch.getRequestBody().readNBytes(65537);
            verlangen(rumpf.length <= 65536);
            if (methode.equals("GET")) {
                verlangen(rumpf.length == 0);
                if (sammlung) {
                    String liste = auftraege.values().stream()
                        .sorted(Comparator.comparingInt(auftrag -> Integer.parseInt(auftrag.kennung().substring(1))))
                        .map(Wartungsauftrag::alsJson).collect(java.util.stream.Collectors.joining(",", "[", "]"));
                    antworten(austausch, 200, liste);
                } else if (auftraege.containsKey(kennung)) {
                    antworten(austausch, 200, auftraege.get(kennung).alsJson());
                } else {
                    fehler(austausch, 404, "auftrag_nicht_gefunden", "Der angefragte Auftrag wurde nicht gefunden.");
                }
                return;
            }
            String medientyp = austausch.getRequestHeaders().getFirst("Content-Type");
            if (medientyp == null || !medientyp.matches("(?i)application/json(?:\\s*;\\s*charset=utf-8)?\\s*")) {
                fehler(austausch, 415, "medientyp_nicht_unterstuetzt", "Erwartet wird application/json mit UTF-8.");
                return;
            }
            String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(rumpf)).toString();
            Map<String, String> felder = new Json(text).objektLesen();
            verlangen(felder.keySet().equals(Set.of("bezeichnung", "prioritaet")));
            eingabePruefen(felder.get("bezeichnung"), felder.get("prioritaet"));
            String neueKennung = "A" + String.format(java.util.Locale.ROOT, "%02d", naechsteNummer++);
            Wartungsauftrag auftrag = new Wartungsauftrag(neueKennung, felder.get("bezeichnung"),
                felder.get("prioritaet"), "offen");
            auftraege.put(neueKennung, auftrag);
            austausch.getResponseHeaders().set("Location", "/auftraege/" + neueKennung);
            antworten(austausch, 201, auftrag.alsJson());
        } catch (IllegalArgumentException | CharacterCodingException fehler) {
            fehler(austausch, 400, "ungueltige_anfrage", "Anfrage ungueltig: Feld oder Kennung pruefen.");
        } finally {
            austausch.close();
        }
    }

    public static void main(String[] argumente) throws IOException {
        int port = argumente.length == 0 ? 8080 : Integer.parseInt(argumente[0]);
        Main portal = new Main(Path.of("beispieldaten/auftraege.json"));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", portal::bearbeiten);
        server.start();
        System.out.println("API bereit: http://127.0.0.1:" + server.getAddress().getPort());
    }

    /** JSON-Teilformat: Objekte mit Zeichenketten und Listen solcher Objekte.
     * Andere JSON-Werte sind für die fachlichen Felder ungültige Eingaben. */
    private static class Json {
        private final String text;
        private int stelle;

        Json(String text) { this.text = text; }

        private void leerraum() {
            while (stelle < text.length() && " \t\r\n".indexOf(text.charAt(stelle)) >= 0) stelle++;
        }

        private boolean nehmen(char zeichen) {
            leerraum();
            if (stelle < text.length() && text.charAt(stelle) == zeichen) {
                stelle++;
                return true;
            }
            return false;
        }

        private void erwarten(char zeichen) { verlangen(nehmen(zeichen)); }

        private String lesenZeichenkette() {
            erwarten('"');
            StringBuilder wert = new StringBuilder();
            boolean abgeschlossen = false;
            while (stelle < text.length()) {
                char zeichen = text.charAt(stelle++);
                if (zeichen == '"') { abgeschlossen = true; break; }
                verlangen(zeichen >= 0x20);
                if (zeichen == '\\') {
                    verlangen(stelle < text.length());
                    char folge = text.charAt(stelle++);
                    switch (folge) {
                        case '"', '\\', '/' -> wert.append(folge);
                        case 'b' -> wert.append('\b');
                        case 'f' -> wert.append('\f');
                        case 'n' -> wert.append('\n');
                        case 'r' -> wert.append('\r');
                        case 't' -> wert.append('\t');
                        case 'u' -> {
                            verlangen(stelle + 4 <= text.length());
                            String ziffern = text.substring(stelle, stelle + 4);
                            verlangen(ziffern.matches("[0-9a-fA-F]{4}"));
                            wert.append((char) Integer.parseInt(ziffern, 16));
                            stelle += 4;
                        }
                        default -> verlangen(false);
                    }
                } else wert.append(zeichen);
            }
            verlangen(abgeschlossen);
            // Einzelne UTF-16-Surrogate sind keine Unicode-Codepunkte.
            for (int index = 0; index < wert.length(); index++) {
                char zeichen = wert.charAt(index);
                if (Character.isHighSurrogate(zeichen)) {
                    verlangen(index + 1 < wert.length() && Character.isLowSurrogate(wert.charAt(index + 1)));
                    index++;
                } else verlangen(!Character.isLowSurrogate(zeichen));
            }
            return wert.toString();
        }

        private Map<String, String> objekt() {
            erwarten('{');
            Map<String, String> felder = new LinkedHashMap<>();
            if (nehmen('}')) return felder;
            do {
                String schluessel = lesenZeichenkette();
                erwarten(':');
                String wert = lesenZeichenkette();
                verlangen(!felder.containsKey(schluessel));
                felder.put(schluessel, wert);
            } while (nehmen(','));
            erwarten('}');
            return felder;
        }

        private void endePruefen() { leerraum(); verlangen(stelle == text.length()); }

        Map<String, String> objektLesen() {
            Map<String, String> felder = objekt();
            endePruefen();
            return felder;
        }

        List<Map<String, String>> listeLesen() {
            List<Map<String, String>> liste = new ArrayList<>();
            erwarten('[');
            if (!nehmen(']')) {
                do { liste.add(objekt()); } while (nehmen(','));
                erwarten(']');
            }
            endePruefen();
            return liste;
        }

        static String zeichenkette(String wert) {
            StringBuilder ausgabe = new StringBuilder("\"");
            for (char zeichen : wert.toCharArray()) {
                if (zeichen == '"' || zeichen == '\\') ausgabe.append('\\').append(zeichen);
                else if (zeichen < 0x20) ausgabe.append(String.format("\\u%04x", (int) zeichen));
                else ausgabe.append(zeichen);
            }
            return ausgabe.append('"').toString();
        }
    }
}
