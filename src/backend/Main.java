// Technischer Einstieg; die REST-API folgt in P04-T02.
public class Main {
    record Wartungsauftrag(String kennung, String bezeichnung, String prioritaet, String zustand) {}
    static Wartungsauftrag erstellen(String bezeichnung) {
        throw new UnsupportedOperationException("P04-T02: Eingabepruefung und Erstellung noch offen");
    }
    public static void main(String[] args) {
        System.out.println("P04 initialisiert; Vertrag und Beispieldaten vorhanden, API noch offen.");
    }
}
