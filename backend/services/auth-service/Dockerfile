# syntax=docker/dockerfile:1
# Multi-stage build: Maven builds the jar, a JRE-only image runs it as a non-root user.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# UID 10001, group 0: works on Kubernetes and on OpenShift's arbitrary-UID policy.
RUN useradd --uid 10001 --gid 0 --no-create-home --shell /usr/sbin/nologin app \
 && mkdir -p /app/Documents && chown -R 10001:0 /app && chmod -R g=u /app
USER 10001
# Size the heap from the container memory limit, not the host's.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
