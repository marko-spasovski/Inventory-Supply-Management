FROM maven:3.9-eclipse-temurin-21

WORKDIR /app

# copy only pom first (cache)
COPY pom.xml .
RUN mvn dependency:go-offline

# copy source
COPY . .

EXPOSE 8082

# THIS is the key part (like dotnet watch)
CMD ["mvn", "spring-boot:run"]