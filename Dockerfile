# --- Etapa 1: compilación ---
# Se compila DENTRO de un contenedor con Maven+JDK para no depender de que el
# servidor tenga exactamente la misma versión de Maven/JDK que se usó en
# desarrollo (el mismo problema de PATH que ya tuvimos localmente).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Maven sin límite de heap se come toda la RAM de un VPS chico y el build muere
# con "Killed" sin explicación. 1GB alcanza de sobra para este proyecto.
ENV MAVEN_OPTS="-Xmx1g"

# Copiar primero solo el pom.xml para que Docker cachee las dependencias y no
# las vuelva a bajar en cada build si el código cambió pero las dependencias no.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Etapa 2: ejecución ---
# Imagen final SOLO con el JRE (no Maven, no JDK completo) — más liviana y con
# menos superficie de ataque para producción.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# El proceso NO corre como root: si algún día se explota una vulnerabilidad en
# la app, el atacante queda con un usuario sin privilegios dentro del
# contenedor en vez de root.
RUN useradd --system --create-home --uid 10001 aurora
COPY --from=build --chown=aurora:aurora /app/target/*.jar app.jar
USER aurora

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
