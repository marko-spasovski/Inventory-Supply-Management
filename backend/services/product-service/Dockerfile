# syntax=docker/dockerfile:1
# Multi-stage build: the SDK publishes, the ASP.NET runtime image runs it as its built-in non-root user.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY product-service.csproj .
RUN dotnet restore product-service.csproj
COPY . .
# The checked-in global.json pins an exact SDK; the image's 9.0 SDK is the pinned toolchain here.
RUN rm -f global.json && dotnet publish product-service.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
RUN mkdir -p /app/Documents && chown -R $APP_UID:0 /app && chmod -R g=u /app
USER $APP_UID
ENV ASPNETCORE_URLS=http://+:8085 \
    DOTNET_gcServer=0
EXPOSE 8085
ENTRYPOINT ["dotnet", "product-service.dll"]
