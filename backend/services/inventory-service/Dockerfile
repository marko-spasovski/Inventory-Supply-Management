FROM maven:3.9-eclipse-temurin-21

WORKDIR /app

# Copy pom only (cache dependencies)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy full source
COPY . .

EXPOSE 8086

CMD ["mvn", "spring-boot:run", "-Dspring-boot.run.jvmArguments=-javaagent:/hotswap-agent.jar"]