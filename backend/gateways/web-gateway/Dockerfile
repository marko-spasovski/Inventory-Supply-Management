FROM maven:3.9-eclipse-temurin-21

WORKDIR /app

# copy only pom first (cache)
COPY pom.xml .
COPY src ./src

EXPOSE 8080

# THIS is the key part (like dotnet watch)
CMD ["mvn", "spring-boot:run"]