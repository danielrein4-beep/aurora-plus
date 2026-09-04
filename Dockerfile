# --- Etapa 1: compilación ---
# Se compila DENTRO de un contenedor con Maven+JDK para no depender de que el
# servidor de Hetzner tenga instalado exactamente la misma versión de Maven/JDK
# que se usó en desarrollo (el mismo problema de PATH que tuvimos localmente).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiar primero solo el pom.xml para que Docker cachee las dependencias
# descargadas y no las vuelva a bajar en cada build si el código cambió pero
# las dependencias no.
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q clean package -DskipTests

# --- Etapa 2: ejecución ---
# Imagen final SOLO con el JRE (no Maven, no JDK completo) — más liviana y con
# menos superficie de ataque para producción.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
